import type { CreateOptionsFormProps } from "../../platform/gameLibraryTypes";
import { monopolyDefaultCreateOptions } from "./metadata";

export default function MonopolyCreateOptions({ value, onChange }: CreateOptionsFormProps) {
  return <fieldset className="space-y-2">
    <legend className="text-sm text-amber-200">Số người chơi</legend>
    <div className="flex flex-wrap gap-2">{[2,3,4,5,6].map(n => <button type="button" key={n}
      aria-pressed={(value.seatCount ?? monopolyDefaultCreateOptions.seatCount) === n} onClick={() => onChange({ ...value, seatCount: n })}
      className={`rounded border px-4 py-2 ${(value.seatCount ?? 4) === n ? "border-amber-300 bg-amber-800 text-white" : "border-amber-900 text-amber-300"}`}>{n}</button>)}</div>
  </fieldset>;
}
