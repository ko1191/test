import { Link, Outlet } from 'react-router-dom';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Invoicing System</h1>
        <nav>
          <Link to="/">Dashboard</Link>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
