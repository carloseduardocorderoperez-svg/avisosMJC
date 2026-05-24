import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import App from "./App.jsx"
import "./styles/app.css"
import "./styles/blocks.css"
// Install global fetch wrapper early so all fetch calls are intercepted
import installFetchWrapper from "./utils/fetchWrapper"
installFetchWrapper()

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)