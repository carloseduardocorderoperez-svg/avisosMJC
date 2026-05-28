import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import App from "./App.jsx"
import "./styles/app.css"
import "./styles/blocks.css"
// Install global fetch wrapper early so all fetch calls are intercepted
import installFetchWrapper from "./utils/fetchWrapper"
installFetchWrapper()

// Prevent embedding Google Drive pages in iframes (CSP/frame-ancestors).
// Intercept iframe `src` assignments and `setAttribute('src', ...)` and
// replace them with a safe external link instead of letting the browser
// attempt to load the Drive preview inside an iframe (which triggers CSP errors).
try {
  const origSetAttribute = HTMLIFrameElement.prototype.setAttribute;
  HTMLIFrameElement.prototype.setAttribute = function (name, value) {
    if (name === "src" && typeof value === "string" && value.includes("drive.google.com")) {
      // create a replacement link next to the iframe and avoid setting src
      try {
        const a = document.createElement("a");
        a.href = value;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Abrir vista previa en Drive";
        a.className = "btn btn-neutral";
        if (this.parentNode) this.parentNode.insertBefore(a, this.nextSibling);
      } catch (e) {
        // ignore
      }
      return;
    }
    return origSetAttribute.call(this, name, value);
  };

  const srcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
  if (srcDesc && srcDesc.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, "src", {
      set: function (value) {
        if (typeof value === "string" && value.includes("drive.google.com")) {
          try {
            const a = document.createElement("a");
            a.href = value;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = "Abrir vista previa en Drive";
            a.className = "btn btn-neutral";
            if (this.parentNode) this.parentNode.insertBefore(a, this.nextSibling);
          } catch (e) {}
          return;
        }
        return srcDesc.set.call(this, value);
      },
      get: function () {
        return srcDesc.get.call(this);
      },
      configurable: true,
      enumerable: true,
    });
  }
} catch (err) {
  // best-effort; don't break app if environment forbids prototype changes
  // eslint-disable-next-line no-console
  console.warn("Drive iframe blocker not installed:", err && err.message ? err.message : err);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)