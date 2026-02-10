import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { prefetchData } from "./hooks/useDataCache";

// Prefetch data on app load for instant navigation
prefetchData().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
