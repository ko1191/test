const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function HomePage() {
  return (
    <section>
      <h2>Dashboard</h2>
      <p>The invoicing dashboard will live here.</p>
      <p>
        API base URL: <code>{apiBaseUrl}</code>
      </p>
    </section>
  );
}

export default HomePage;
