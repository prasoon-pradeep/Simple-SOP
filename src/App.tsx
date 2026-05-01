import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Editor from "./pages/Editor";
import Home from "./pages/Home";

function Viewer() {
  return <div className="p-4">Viewer Screen</div>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sop/:id/edit" element={<Editor />} />
        <Route path="/sop/:id/view" element={<Viewer />} />
      </Routes>
    </Router>
  );
}

export default App;
