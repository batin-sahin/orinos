import { createRoot } from "react-dom/client";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-500.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow/latin-700.css";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource-variable/spline-sans-mono/wght.css";
import App from "./App";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root");
createRoot(container).render(<App />);
