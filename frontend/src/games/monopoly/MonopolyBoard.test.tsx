import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MonopolyBoard from "./MonopolyBoard";
import MonopolyReplayBoard from "./MonopolyReplayBoard";
import MonopolyCreateOptions from "./CreateOptions";
import { useGameStore } from "../../platform/gameStore";
import type { MonopolyMap, MonopolyState } from "./types";
import { actor, boardPosition } from "./types";
import type { RoomDto } from "../../platform/types";

function setup(phase = "Roll", side: string | null = "P0") {
  const state: MonopolyState = {
    version:1,started:true,players:["An","Bình"].map(name=>({name,position:0,cash:1500,bankrupt:false,inJail:false,jailAttempts:0,jailCards:[]})),
    properties:Array.from({length:40},()=>({owner:null,buildings:0,mortgaged:false})),turn:0,phase,dice:[1,2],doubles:0,extraRoll:false,
    houses:32,hotels:12,winner:null,lastCard:"",log:["Bắt đầu ván"],payments:[],auction:null,trade:null,
  };
  const map: MonopolyMap = {edition:"Classic",tiles:Array.from({length:40},(_,index)=>({index,name:`Đường ${index}`,kind:"Street",group:"Brown",price:60,houseCost:50,rents:[2,10,30,90,160,250]}))};
  const room: RoomDto<MonopolyMap,MonopolyState> = {id:"m1",gameKey:"monopoly",status:"Playing",winner:null,map,state,createdAt:"2026-10-25",seatCount:2,seats:[{displayName:"An",connected:true,lastSeenAt:null},{displayName:"Bình",connected:true,lastSeenAt:null}],ownerUserId:"u1",mySide:side,isMine:true};
  useGameStore.setState({room,mySide:side,error:"",connectionState:"connected"});
  return {state,map,room};
}
const renderBoard = () => {
  const makeMove=vi.fn();
  render(<MonopolyBoard makeMove={makeMove} onLeave={vi.fn()} onRematch={vi.fn()} rematching={false}/>);
  return makeMove;
};
beforeEach(()=>{useGameStore.setState({room:null,mySide:null,error:"",connectionState:"connected"});});

describe("Monopoly board",()=>{
  it("places all 40 squares uniquely on the perimeter",()=>{
    const positions=Array.from({length:40},(_,i)=>boardPosition(i));
    expect(new Set(positions.map(p=>`${p.gridRow},${p.gridColumn}`)).size).toBe(40);
    expect(positions.every(p=>[1,11].includes(p.gridRow)||[1,11].includes(p.gridColumn))).toBe(true);
    expect(positions[0]).toEqual({gridRow:11,gridColumn:11});
  });
  it("renders all board squares and sends a roll intent",()=>{
    setup(); const move=renderBoard();
    expect(screen.getAllByRole("button",{name:/^Ô \d+:/})).toHaveLength(40);
    fireEvent.click(screen.getByRole("button",{name:/Đổ xúc xắc/})); expect(move).toHaveBeenCalledWith("m1",{type:"ROLL"});
  });
  it("disables spectator and disconnected decisions",()=>{
    setup("Roll",null); renderBoard(); expect(screen.getByRole("button",{name:/Đổ xúc xắc/})).toBeDisabled();
  });
  it("disables decisions during reconnect",()=>{
    setup();useGameStore.setState({connectionState:"reconnecting"});renderBoard();
    expect(screen.getByRole("button",{name:/Đổ xúc xắc/})).toBeDisabled();
  });
  it("offers purchase or auction only in purchase phase",()=>{
    setup("Buy");const move=renderBoard();
    fireEvent.click(screen.getByRole("button",{name:"Đưa ra đấu giá"}));expect(move).toHaveBeenCalledWith("m1",{type:"DECLINE"});
  });
  it("uses auction actor instead of turn owner",()=>{
    const {state}=setup("Auction","P1");state.auction={tile:3,bid:20,leader:0,actor:1,passed:[]};
    expect(actor(state)).toBe(1);const move=renderBoard();
    fireEvent.change(screen.getByRole("spinbutton",{name:"Giá đấu"}),{target:{value:"35"}});
    fireEvent.click(screen.getByRole("button",{name:"Trả giá"}));expect(move).toHaveBeenCalledWith("m1",{type:"BID",amount:35});
  });
  it("lets the birthday debtor settle even outside their turn",()=>{
    const {state}=setup("Debt","P1");state.payments=[{from:1,to:0,amount:10}];const move=renderBoard();
    fireEvent.click(screen.getByRole("button",{name:"Thanh toán"}));expect(move).toHaveBeenCalledWith("m1",{type:"SETTLE"});
  });
  it("selects property and submits management with exact tile",()=>{
    const {state}=setup();state.properties[3].owner=0;const move=renderBoard();
    fireEvent.click(screen.getByRole("button",{name:/^Ô 3:/}));
    fireEvent.click(screen.getByRole("button",{name:"Thế chấp"}));expect(move).toHaveBeenCalledWith("m1",{type:"MORTGAGE",tile:3});
  });
  it("recipient can accept a trade",()=>{
    const {state}=setup("Trade","P1");state.trade={from:0,to:1,cashOffered:100,cashRequested:0,offered:[],requested:[],offeredCards:[],requestedCards:[],redeemRequested:false};const move=renderBoard();
    fireEvent.click(screen.getByRole("button",{name:"Chấp nhận"}));expect(move).toHaveBeenCalledWith("m1",{type:"ACCEPT"});
  });
  it("guards malformed room state",()=>{
    const {room}=setup();useGameStore.setState({room:{...room,map:{}}});renderBoard();
    expect(screen.getByRole("alert")).toHaveTextContent("Không đọc được bàn cờ");
  });
  it("offers negotiation to a player outside the current turn",()=>{
    setup("Roll","P1");renderBoard();expect(screen.getByText("Đề nghị giao dịch")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:/Đổ xúc xắc/})).toBeDisabled();
  });
  it("debtor can offer a jail-free card to raise cash",()=>{
    const {state}=setup("Debt");state.players[0].jailCards=["Chance"];state.payments=[{from:0,to:null,amount:200}];
    const move=renderBoard();fireEvent.click(screen.getByText("Đề nghị giao dịch"));
    fireEvent.click(screen.getByRole("checkbox",{name:"Thẻ ra tù (Cơ hội)"}));
    fireEvent.change(screen.getByRole("spinbutton",{name:"Tiền nhận"}),{target:{value:"50"}});
    fireEvent.click(screen.getByRole("button",{name:"Gửi đề nghị"}));
    expect(move).toHaveBeenCalledWith("m1",expect.objectContaining({type:"TRADE",offeredCards:["Chance"],cashRequested:50}));
  });
  it("trade recipient can choose to redeem mortgaged property immediately",()=>{
    const {state}=setup("Trade","P1");state.properties[3]={owner:0,buildings:0,mortgaged:true};
    state.trade={from:0,to:1,cashOffered:0,cashRequested:0,offered:[3],requested:[],offeredCards:[],requestedCards:[],redeemRequested:false};
    const move=renderBoard();fireEvent.click(screen.getByRole("button",{name:"Chấp nhận và giải chấp ngay"}));
    expect(move).toHaveBeenCalledWith("m1",{type:"ACCEPT",redeemReceived:true});
  });
  it("building auction lets bidder choose their legal destination deed",()=>{
    const {state}=setup("Auction","P1");state.auction={kind:"House",tile:3,bid:20,leader:0,actor:1,passed:[],eligibleTiles:{"0":[1,3],"1":[37,39]}};
    const move=renderBoard();fireEvent.change(screen.getByRole("combobox",{name:"Đất xây sau đấu giá"}),{target:{value:"39"}});
    fireEvent.change(screen.getByRole("spinbutton",{name:"Giá đấu"}),{target:{value:"75"}});
    fireEvent.click(screen.getByRole("button",{name:"Trả giá"}));
    expect(move).toHaveBeenCalledWith("m1",{type:"BID",amount:75,tile:39});
  });
  it("inheritance choices belong to the creditor instead of the turn owner",()=>{
    const {state}=setup("Inheritance","P1");state.inheritedMortgages=[{owner:1,tile:3}];state.properties[3]={owner:1,buildings:0,mortgaged:true};
    expect(actor(state)).toBe(1);const move=renderBoard();
    fireEvent.click(screen.getByRole("button",{name:"Giải chấp ngay · 33"}));
    expect(move).toHaveBeenCalledWith("m1",{type:"REDEEM_INHERITED"});
    expect(screen.queryByText("Đề nghị giao dịch")).not.toBeInTheDocument();
  });
  it("creditor can keep a mortgage when cash is insufficient to redeem",()=>{
    const {state}=setup("Inheritance","P1");state.inheritedMortgages=[{owner:1,tile:3}];state.players[1].cash=0;
    const move=renderBoard();expect(screen.getByRole("button",{name:"Giải chấp ngay · 33"})).toBeDisabled();
    fireEvent.click(screen.getByRole("button",{name:"Giữ thế chấp · 3"}));
    expect(move).toHaveBeenCalledWith("m1",{type:"KEEP_INHERITED"});
  });
  it("other players cannot decide inherited mortgage treatment",()=>{
    const {state}=setup("Inheritance","P0");state.inheritedMortgages=[{owner:1,tile:3}];renderBoard();
    expect(screen.getByRole("button",{name:"Giữ thế chấp · 3"})).toBeDisabled();
    expect(screen.getByRole("button",{name:"Giải chấp ngay · 33"})).toBeDisabled();
  });
  it("replay renders saved outcomes without replacing or controlling the live room",()=>{
    const {room,state,map}=setup();const snapshot=structuredClone(state);snapshot.players[0].cash=987;
    const view=render(<MonopolyReplayBoard roomId="replay-only" map={map} state={snapshot} seats={["An","Bình"]}/>);
    expect(screen.getByText("Bản ghi chỉ đọc")).toBeInTheDocument();expect(screen.getByText(/987 ·/)).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/Đổ xúc xắc/})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/Rời phòng/})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/Chơi lại/i})).not.toBeInTheDocument();
    expect(useGameStore.getState().room).toBe(room);expect(state.players[0].cash).toBe(1500);
    snapshot.players[0].cash=777;
    view.rerender(<MonopolyReplayBoard roomId="replay-only" map={map} state={snapshot} seats={["An","Bình"]}/>);
    expect(screen.getByText(/777 ·/)).toBeInTheDocument();expect(useGameStore.getState().mySide).toBe("P0");
  });
  it("old replay steps without snapshots show a clear fallback",()=>{
    const {map}=setup();render(<MonopolyReplayBoard roomId="old" map={map} state={null} seats={["An","Bình"]}/>);
    expect(screen.getByRole("status")).toHaveTextContent("chưa có snapshot");
  });
  it("corrupt replay player positions fall back without accessing an invalid board square",()=>{
    const {map,state}=setup();state.players[0].position=99;
    render(<MonopolyReplayBoard roomId="corrupt" map={map} state={state} seats={["An","Bình"]}/>);
    expect(screen.getByRole("status")).toHaveTextContent("bị lỗi dữ liệu");
  });
  it("asks actual building demand and sends the selected legal destination",()=>{
    const {state}=setup("BuildingDemand","P1");state.buildingDemand={kind:"House",actor:1,eligibleTiles:{"0":[1],"1":[37,39]},requests:{"0":1},responded:[0],resumePhase:"Roll"};
    const move=renderBoard();expect(actor(state)).toBe(1);
    fireEvent.change(screen.getByRole("combobox",{name:"Đất muốn xây"}),{target:{value:"39"}});
    fireEvent.click(screen.getByRole("button",{name:"Tôi muốn mua"}));
    expect(move).toHaveBeenCalledWith("m1",{type:"REQUEST_BUILD",tile:39});
    expect(screen.queryByRole("button",{name:"Trả giá"})).not.toBeInTheDocument();
    expect(screen.queryByText("Đề nghị giao dịch")).not.toBeInTheDocument();
  });
  it("allows refusing a building without placing a bid",()=>{
    const {state}=setup("BuildingDemand","P1");state.buildingDemand={kind:"Hotel",actor:1,eligibleTiles:{"1":[39]},requests:{"0":1},responded:[0],resumePhase:"Roll"};
    const move=renderBoard();fireEvent.click(screen.getByRole("button",{name:"Không mua đợt này"}));
    expect(move).toHaveBeenCalledWith("m1",{type:"SKIP_BUILD"});
  });
  it("enforces the edition auction minimum in the bidding control",()=>{
    const {state,map}=setup("Auction");map.auctionMinimumBid=10;state.auction={tile:3,bid:0,leader:null,actor:0,passed:[]};
    const move=renderBoard();expect(screen.getByRole("spinbutton",{name:"Giá đấu"})).toHaveAttribute("min","10");
    fireEvent.click(screen.getByRole("button",{name:"Trả giá"}));expect(move).toHaveBeenCalledWith("m1",{type:"BID",amount:10});
  });
  it("shows utility rent dice separately from the movement roll",()=>{
    const {state}=setup("End");state.dice=[1,2];state.utilityDice=[4,5];renderBoard();
    expect(screen.getByLabelText("Xúc xắc 1 và 2")).toBeInTheDocument();
    expect(screen.getByText("Xúc xắc tính thuê dịch vụ: 4 + 5 = 9")).toBeInTheDocument();
  });
  it("offers only the two-to-six seat range of the frozen C1009 edition",()=>{
    const change=vi.fn();render(<MonopolyCreateOptions value={{seatCount:4}} onChange={change}/>);
    expect(screen.queryByRole("button",{name:"7"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"8"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"6"}));expect(change).toHaveBeenCalledWith({seatCount:6});
  });
});
