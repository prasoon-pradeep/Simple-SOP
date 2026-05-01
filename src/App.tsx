import { HashRouter as Router, Routes, Route } from "react-router-dom";

function Home() {
  return <div className="p-4">Home Screen</div>;
}

function Editor() {
  return <div className="p-4">Editor Screen</div>;
}

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
