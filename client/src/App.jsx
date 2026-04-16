import { Routes, Route, useLocation } from "react-router-dom"

import Avisos from "./pages/Avisos"
import Editor from "./pages/Editor"
import Preview from "./pages/Preview"
import Extra from "./pages/Extra"
import Dashboard from "./pages/Dashboard"

import Navbar from "./components/layout/Navbar"

export default function App() {

  const location = useLocation()

  const isDesignerRoute =
    location.pathname === "/" ||
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/avisos/")

  return (

    <div className="app-shell">

      <Navbar />

      <div
        className={
          isDesignerRoute
            ? "page-container page-container-fixed"
            : "page-container"
        }
      >

        <Routes>

          <Route path="/" element={<Dashboard />} />

          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/avisos/:setId" element={<Avisos />} />

          <Route path="/avisos/:setId/preview" element={<Preview />} />

          <Route path="/editor/:id" element={<Editor />} />

          <Route path="/extra" element={<Extra />} />

        </Routes>

      </div>

    </div>

  )

}