import { Outlet } from "react-router-dom";
import TopBar from "./components/TopBar";

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
