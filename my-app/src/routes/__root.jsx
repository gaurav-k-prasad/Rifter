import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import Header from "../components/Header.tsx";
import {
  CallModeProvider,
  ClientsProvider,
  RoomIdProvider,
  SocketProvider,
  StreamProvider,
} from "../contexts.jsx";

export const Route = createRootRoute({
  component: () => (
    <>
      <CallModeProvider>
        <RoomIdProvider>
          <StreamProvider>
            <ClientsProvider>
              <SocketProvider>
                <Header />
                <Outlet />
                <TanStackRouterDevtools />
              </SocketProvider>
            </ClientsProvider>
          </StreamProvider>
        </RoomIdProvider>
      </CallModeProvider>
    </>
  ),
});
