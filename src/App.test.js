import { render } from '@testing-library/react';
import App from './App';

// Replaces the "renders learn react link" placeholder CRA generates, which
// never matched anything in this app. Mounting App pulls in the router, the
// whole route table, AuthContext and the design system, so this is the cheapest
// guard there is against a bad import or a module-level throw shipping to prod.
test('the app mounts without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeInTheDocument();
});
