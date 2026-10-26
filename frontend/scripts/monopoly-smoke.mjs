// Local development only: backend must use EMAIL_PROVIDER=dev-log and Auth__DevLogOtp=true.
// No email is sent. Tokens remain in memory; output contains only test results and room IDs.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

const base = process.env.MONOPOLY_SMOKE_URL ?? "http://127.0.0.1:5000";
const logFile = process.env.MONOPOLY_SMOKE_LOG ?? resolve("../backend/BoardGame.Api/bin/monopoly-live.log");
const fullGame = process.argv.includes("--full-game");
const restartHost = process.argv.includes("--restart-host");
const declineBuildingDemand = process.argv.includes("--decline-building-demand");
const housesOnly = process.argv.includes("--houses-only");
const playerCount = Number(process.argv.find(arg=>arg.startsWith("--players="))?.split("=")[1] ?? 2);
assert.ok(Number.isInteger(playerCount) && playerCount>=2 && playerCount<=6);
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Smoke test is restricted to localhost.");
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(check) {
  for (let n=0;n<100;n++) { if (await check()) return; await wait(50); }
  throw new Error("Timed out waiting for realtime state.");
}
async function request(path, cookie, data) {
  const response = await fetch(base + path, { method: data ? "POST" : "GET", headers: {
    "content-type":"application/json", ...(cookie ? {cookie} : {}),
  }, ...(data ? {body:JSON.stringify(data)} : {}) });
  assert.ok(response.ok, `${path}: ${response.status} ${await response.clone().text()}`);
  const text=await response.text();
  return {body:text?JSON.parse(text):null,cookie:response.headers.get("set-cookie")?.split(";")[0]};
}

// Operator restarts the local API after the checkpoint is printed. No production control endpoint.
async function checkHostRestart(id) {
  const expected = structuredClone(clients[0].room);
  assert.equal(expected.state.phase, "Trade");
  await Promise.all(clients.map(client => client.connection.stop()));
  console.log(JSON.stringify({ checkpoint: "restart-host", roomId: id, phase: expected.state.phase }));
  let observedDown = false;
  let restored = false;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    let online = false;
    try {
      const response = await fetch(base + `/api/games/${id}`, {
        headers: { cookie: clients[0].cookie }, signal: AbortSignal.timeout(1000),
      });
      online = response.ok;
    } catch { /* Connection refused is expected while the host is stopped. */ }
    if (!online) observedDown = true;
    if (observedDown && online) { restored = true; break; }
    await wait(250);
  }
  assert.ok(observedDown && restored, "Expected the API to stop and return within 60 seconds.");
  for (let index = 0; index < clients.length; index++) {
    const client = clients[index];
    await client.connection.start();
    await client.connection.invoke("JoinRoom", id);
    assert.equal(client.side, index < playerCount ? `P${index}` : null);
    assert.deepEqual(client.room.state, expected.state);
    assert.deepEqual(client.room.map, expected.map);
    assert.equal(client.room.status, expected.status);
    assert.equal(client.errors.length, 0);
    const persisted = await request(`/api/games/${id}`, client.cookie);
    assert.deepEqual(persisted.body.state, expected.state);
  }
  console.log(JSON.stringify({ checkpoint: "restart-restored", roomId: id, phase: expected.state.phase, players: playerCount, spectators: 1 }));
}
async function login(index) {
  const email=`monopoly-smoke-${Date.now()}-${index}@example.invalid`;
  await request("/api/auth/request-otp",null,{email});
  let code;
  await until(async()=>{
    const bytes=await readFile(logFile);
    const log=bytes.toString(bytes[0]===255 && bytes[1]===254 ? "utf16le" : "utf8");
    code=log.split("\n").findLast(line=>line.includes(email)&&/:\s*\d{6}\s*$/.test(line))?.match(/:\s*(\d{6})\s*$/)?.[1];
    return !!code;
  });
  const verified=await request("/api/auth/verify-otp",null,{email,code});
  assert.ok(verified.cookie);
  const token=decodeURIComponent(verified.cookie.slice(verified.cookie.indexOf("=")+1));
  const client={cookie:verified.cookie,room:null,side:null,errors:[],connection:new HubConnectionBuilder()
    .withUrl(base+"/hubs/game",{accessTokenFactory:()=>token}).configureLogging(LogLevel.None).build()};
  client.connection.on("GameStateUpdated",room=>{client.room=room;assert.equal("chance" in room.state,false);assert.equal("chest" in room.state,false);});
  client.connection.on("Seated",event=>{client.side=event.side;});
  client.connection.on("Error",error=>client.errors.push(error));
  await client.connection.start();
  return client;
}
const clients=[];

function fullGameMove(room, seat) {
  const s=room.state,tiles=room.map.tiles,player=s.players[seat];
  const group=t=>tiles.filter(other=>other.kind==="Street" && other.group===t.group);
  const owned=tiles.filter(t=>s.properties[t.index].owner===seat);
  if(s.phase==="Roll") {
    const redeem=owned.find(t=>s.properties[t.index].mortgaged && t.kind==="Street"
      && group(t).every(other=>s.properties[other.index].owner===seat)
      && player.cash>=t.price/2+Math.ceil(t.price/20)+150);
    if(redeem) return {type:"UNMORTGAGE",tile:redeem.index};
    const buySet=tiles.find(t=>t.kind==="Street" && s.properties[t.index].owner!==null && s.properties[t.index].owner!==seat
      && group(t).some(other=>s.properties[other.index].owner===seat)
      && group(t).every(other=>s.properties[other.index].buildings===0)
      && !s.inheritedMortgages?.some(m=>m.tile===t.index)
      && player.cash>=t.price*2+(s.properties[t.index].mortgaged?Math.ceil(t.price/20):0));
    if(buySet) return {type:"TRADE",target:s.properties[buySet.index].owner,requested:[buySet.index],cashOffered:buySet.price*2};
    const build=owned.find(t=>t.kind==="Street" && s.properties[t.index].buildings<(housesOnly?4:5) && player.cash>=t.houseCost+100
      && (s.properties[t.index].buildings===4?s.hotels>0:s.houses>0)
      && group(t).every(other=>s.properties[other.index].owner===seat && !s.properties[other.index].mortgaged
        && s.properties[other.index].buildings>=s.properties[t.index].buildings));
    return build?{type:"BUILD",tile:build.index}:{type:"ROLL"};
  }
  if(s.phase==="Buy") return {type:player.cash>=tiles[player.position].price?"BUY":"DECLINE"};
  if(s.phase==="Trade") return {type:"ACCEPT"};
  if(s.phase==="End") return {type:"END"};
  if(s.phase==="Inheritance") return {type:"KEEP_INHERITED"};
  if(s.phase==="BuildingDemand") return declineBuildingDemand?{type:"SKIP_BUILD"}:{type:"REQUEST_BUILD",tile:s.buildingDemand.eligibleTiles[seat][0]};
  if(s.phase==="Auction") {
    const price=s.auction.kind==="Property"?tiles[s.auction.tile].price:tiles[s.auction.tile].houseCost;
    const amount=Math.min(price,s.auction.bid+25,player.cash);
    return amount>=room.map.auctionMinimumBid && amount>s.auction.bid?{type:"BID",amount}:{type:"PASS"};
  }
  if(s.phase==="Debt") {
    if(player.cash>=s.payments[0].amount) return {type:"SETTLE"};
    const sell=owned.find(t=>t.kind==="Street" && group(t).some(other=>s.properties[other.index].buildings>0));
    if(sell) return {type:"SELL_GROUP",tile:sell.index};
    const mortgage=owned.find(t=>!s.properties[t.index].mortgaged && group(t).every(other=>s.properties[other.index].buildings===0));
    return mortgage?{type:"MORTGAGE",tile:mortgage.index}:{type:"BANKRUPT"};
  }
  throw new Error(`Unknown phase ${s.phase}`);
}
try {
  for(let i=0;i<=playerCount;i++) clients.push(await login(i));
  const created=await request("/api/games",clients[0].cookie,{gameKey:"monopoly",options:{seatCount:playerCount}});
  const id=created.body.id;
  for(const client of clients) await client.connection.invoke("JoinRoom",id);
  await until(()=>clients.every(c=>c.room?.status==="Playing"));
  assert.equal(clients[playerCount].side,null);
  assert.deepEqual(clients.slice(0,playerCount).map(c=>c.side),Array.from({length:playerCount},(_,i)=>`P${i}`));
  const rest=await request(`/api/games/${id}`,clients[playerCount].cookie);
  assert.equal("chance" in rest.body.state,false);assert.equal("chest" in rest.body.state,false);
  await clients[playerCount].connection.invoke("MakeMove",id,JSON.stringify({type:"ROLL"}));
  assert.equal(clients[playerCount].errors.length,1);
  clients[playerCount].errors=[];
  const openingTurn=clients[0].room.state.turn;
  const proposer=(openingTurn+1)%playerCount;
  const balances=clients[0].room.state.players.map(p=>p.cash);
  await clients[proposer].connection.invoke("MakeMove",id,JSON.stringify({type:"TRADE",target:openingTurn,cashOffered:1}));
  await until(()=>clients.every(c=>c.room.state.phase==="Trade"));
  if (restartHost) await checkHostRestart(id);
  await clients[openingTurn].connection.invoke("MakeMove",id,JSON.stringify({type:"ACCEPT"}));
  await until(()=>clients.every(c=>c.room.state.phase==="Roll"));
  assert.equal(clients[0].room.state.turn,openingTurn);
  assert.equal(clients[0].room.state.players[proposer].cash,balances[proposer]-1);
  assert.equal(clients[0].room.state.players[openingTurn].cash,balances[openingTurn]+1);
  let actions=0;
  let traded=true;
  const actionCounts={};
  const auctionKinds={};
  const buildingDemandKinds={};
  let faceValueSettlements=0;
  for(;actions<(fullGame?6000:80);actions++) {
    const s=clients[0].room.state;
    if(s.winner) break;
    const actor=s.phase==="Auction"?s.auction.actor:s.phase==="BuildingDemand"?s.buildingDemand.actor:s.phase==="Debt"?s.payments[0].from:s.phase==="Trade"?s.trade.to:s.phase==="Inheritance"?s.inheritedMortgages[0].owner:s.turn;
    let move;
    if(fullGame) move=fullGameMove(clients[0].room,actor);
    else if(s.phase==="Roll") move={type:"ROLL"};
    else if(s.phase==="Buy") move={type:"DECLINE"};
    else if(s.phase==="Auction") move=s.auction.bid===0 && s.players[actor].cash>=clients[0].room.map.auctionMinimumBid?{type:"BID",amount:clients[0].room.map.auctionMinimumBid}:{type:"PASS"};
    else if(s.phase==="Trade") { move={type:"ACCEPT"}; traded=true; }
    else if(s.phase==="End") move={type:"END"};
    else if(s.phase==="Debt") move={type:s.players[actor].cash>=s.payments[0].amount?"SETTLE":"BANKRUPT"};
    else if(s.phase==="Inheritance") move={type:"KEEP_INHERITED"};
    else if(s.phase==="BuildingDemand") move={type:"SKIP_BUILD"};
    else throw new Error(`Unknown phase ${s.phase}`);
    const previous=JSON.stringify(s);
    await clients[actor].connection.invoke("MakeMove",id,JSON.stringify(move));
    assert.equal(clients[actor].errors.length,0,clients[actor].errors.join(";"));
    actionCounts[move.type]=(actionCounts[move.type]??0)+1;
    if(s.phase==="Auction") auctionKinds[s.auction.kind]=(auctionKinds[s.auction.kind]??0)+1;
    if(s.phase==="BuildingDemand") buildingDemandKinds[s.buildingDemand.kind]=(buildingDemandKinds[s.buildingDemand.kind]??0)+1;
    await until(()=>clients.every(c=>JSON.stringify(c.room.state)!==previous));
    for(const client of clients) assert.deepEqual(clients[0].room.state,client.room.state);
    if(s.phase==="BuildingDemand" && clients[0].room.state.phase!=="BuildingDemand" && clients[0].room.state.phase!=="Auction") {
      const next=clients[0].room.state;
      const requests={...s.buildingDemand.requests,...(move.type==="REQUEST_BUILD"?{[actor]:move.tile}:{})};
      for(const [owner,index] of Object.entries(requests)) {
        const price=clients[0].room.map.tiles[index].houseCost;
        const bought=s.players[owner].cash>=price;
        assert.equal(next.players[owner].cash,s.players[owner].cash-(bought?price:0));
        assert.equal(next.properties[index].buildings,s.properties[index].buildings+(bought?1:0));
      }
      assert.equal(next.phase,s.buildingDemand.resumePhase);assert.equal(next.auction,null);faceValueSettlements++;
    }
  }
  assert.ok(traded);
  // Restore a real player's connection and assert the same seat and persisted state via REST.
  await clients[0].connection.stop(); await clients[0].connection.start(); await clients[0].connection.invoke("JoinRoom",id);
  assert.equal(clients[0].side,"P0");
  const restored=await request(`/api/games/${id}`,clients[0].cookie);
  assert.deepEqual(restored.body.state,clients[0].room.state);
  const rematch=await fetch(base+`/api/games/${id}/rematch`,{method:"POST",headers:{cookie:clients[0].cookie}});
  let replayFrames=0;
  if(fullGame) {
    assert.ok(clients[0].room.state.winner,"Full-game policy must reach a winner.");
    assert.equal(rematch.status,200);
    const fresh=await rematch.json();assert.equal(fresh.seatCount,playerCount);assert.equal(fresh.gameKey,"monopoly");
    await request(`/api/games/${fresh.id}/cancel`,clients[0].cookie,{});
    const replay=await request(`/api/games/${id}/replay`,clients[playerCount].cookie);
    replayFrames=replay.body.moves.length;
    assert.equal(replayFrames,actions+3); // room-full plus the opening two-action trade
    assert.deepEqual(replay.body.finalState,clients[0].room.state);
    for(const frame of replay.body.moves) { assert.ok(frame.state);assert.equal("chance" in frame.state,false);assert.equal("chest" in frame.state,false); }
  } else assert.equal(rematch.status,400,"A running game must reject rematch.");
  console.log(JSON.stringify({ok:true,roomId:id,actions,players:playerCount,spectators:1,traded,outOfTurnTrade:true,reconnected:true,
    fullGame,hostRestarted:restartHost,winner:clients[0].room.state.winner,replayFrames,actionCounts,auctionKinds,buildingDemandKinds,faceValueSettlements,hiddenDecks:true}));
} finally {
  await Promise.allSettled(clients.map(c=>c.connection.stop()));
}
