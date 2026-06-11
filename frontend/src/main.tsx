import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

if (localStorage.getItem("theme") === "light") {
  document.documentElement.classList.add("light")
}

const root = document.getElementById("root")
if (root) {
  const link = document.createElement("a")
  link.href = "#chat-input"
  link.className = "skip-link"
  link.textContent = "Skip to chat input"
  root.insertAdjacentElement("beforebegin", link)
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
