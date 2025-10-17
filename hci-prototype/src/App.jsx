import "./App.css";
import SiteHeader from "./components/SiteHeader";
import Map from "./components/Map";
import Highlights from "./components/Highlights";
import PopularRoutesSection from "./components/PopularRoutesSection";
import MobileAppCTA from "./components/MobileAppCTA";
import SiteFooter from "./components/SiteFooter";

function App() {
  return (
    <div className="bg-slate-950 text-white">
      <SiteHeader />
      <main className="flex flex-col gap-0">
        <section id="plan" className="relative">
          <Map />
        </section>
        <Highlights />
        <PopularRoutesSection />
        <MobileAppCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
