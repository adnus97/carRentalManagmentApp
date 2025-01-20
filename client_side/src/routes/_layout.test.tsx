import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/test')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="max-h-screen overflow-hidden">Hello "/_layout/test"!</div>
  );
}
