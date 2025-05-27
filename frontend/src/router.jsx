import Home from "./pages/Home";
// ...
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> }, // Home sebagai landing page
      { path: "admin", element: <Admin /> },
      { path: "hospital", element: <Hospital /> },
      { path: "insurance", element: <Insurance /> },
      { path: "patient", element: <Patient /> },
    ],
  },
]);
