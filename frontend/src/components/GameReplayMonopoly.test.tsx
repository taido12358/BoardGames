import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GameReplayPage from "./GameReplayPage";

vi.mock("../games/monopoly/MonopolyReplayBoard",()=>({default:({state}:{state:unknown})=><output aria-label="Snapshot bàn cờ">{JSON.stringify(state)}</output>}));
const originalFetch=globalThis.fetch;
afterEach(()=>{vi.stubGlobal("fetch",originalFetch);});

describe("Monopoly replay timeline",()=>{
  it("seeks recorded outcomes rather than rerolling the dice",async()=>{
    const data={id:"m1",gameKey:"monopoly",winner:"P1",map:{tiles:[]},seats:["An","Bình"],moves:[
      {moveNumber:1,side:"SYSTEM",move:{type:"__room_full__"},state:{position:0,dice:[0,0]}},
      {moveNumber:2,side:"P0",move:{type:"ROLL"},state:{position:7,dice:[3,4]}},
    ]};
    vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,status:200,json:async()=>data})));
    render(<MemoryRouter initialEntries={["/replay/m1"]}><Routes><Route path="/replay/:roomId" element={<GameReplayPage/>}/></Routes></MemoryRouter>);
    expect(await screen.findByLabelText("Snapshot bàn cờ")).toHaveTextContent('"position":0');
    fireEvent.click(screen.getByRole("button",{name:"Tua tới nước đi 2"}));
    expect(screen.getByLabelText("Snapshot bàn cờ")).toHaveTextContent('"position":7,"dice":[3,4]');
    fireEvent.click(screen.getByRole("button",{name:"Nước đi trước"}));
    expect(screen.getByLabelText("Snapshot bàn cờ")).toHaveTextContent('"position":0');
    expect(screen.getByRole("button",{name:"Tua tới nước đi 1"})).toHaveTextContent("Hệ thống · Bắt đầu ván");
  });
});
