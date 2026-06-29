import { useEffect } from "react";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { useHelloStore } from "../store/helloStore";

/**
 * Opens a SignalR connection to the backend GameHub and forwards
 * every "GreetingCreated" event into the Zustand store.
 */
export function useGameHub() {
  const pushFromHub = useHelloStore((s) => s.pushFromHub);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl("/hubs/game")
      .withAutomaticReconnect()
      .build();

    connection.on("GreetingCreated", (message: string) => pushFromHub(message));
    connection.start().catch((err) => console.error("SignalR error:", err));

    return () => {
      connection.stop();
    };
  }, [pushFromHub]);
}
