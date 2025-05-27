import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Hospital from './pages/Hospital';
import Insurance from './pages/Insurance';
import Patient from './pages/Patient';
import './index.css'; // jika pakai Tailwind

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'admin', element: <Admin/> },
      { path: 'hospital', element: <Hospital /> },
      { path: 'insurance', element: <Insurance/> },
      { path: 'patient', element: <Patient /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
