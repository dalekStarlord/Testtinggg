import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import TripPlannerPage from "./pages/TripPlanner";
import RoutesBrowser from "./pages/RoutesBrowser";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, 
    children: [
      {
        index: true,
        element: <TripPlannerPage />,
      },
      {
        path: "routes",
        element: <RoutesBrowser />,
      },
    ],
  },
]);
