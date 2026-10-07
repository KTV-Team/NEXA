import { notFound } from 'next/navigation';
import { DemoPanel } from './demo-panel';

export default function DemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="nx-container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <a href="/">Back to NEXA</a>
      <h1 style={{ marginTop: 24 }}>Database connection demo</h1>
      <p>Web and mobile read the same PostgreSQL data through the NEXA API.</p>
      <DemoPanel />
    </main>
  );
}
