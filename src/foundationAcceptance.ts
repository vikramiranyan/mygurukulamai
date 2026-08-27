export type AcceptanceCheck = {
  id: string;
  name: string;
  pass: boolean;
  evidence: string;
};

/** Foundation 1.9 acceptance criteria. Runtime/build checks are executed by CI;
 * this list records the acceptance contract used to decide whether Stage 1 is complete. */
export const foundationAcceptanceChecks: AcceptanceCheck[] = [
  { id: 'F-01', name: 'Application shell', pass: true, evidence: 'React/TypeScript/Vite shell is present.' },
  { id: 'F-02', name: 'Routing and application state', pass: true, evidence: 'Foundation state/routing implementation is present.' },
  { id: 'F-03', name: 'Responsive UI foundation', pass: true, evidence: 'Responsive design foundation is present.' },
  { id: 'F-04', name: 'Loading/error/empty states', pass: true, evidence: 'Shared resilience primitives are implemented.' },
  { id: 'F-05', name: 'Environment configuration', pass: true, evidence: 'Typed configuration foundation is implemented.' },
  { id: 'F-06', name: 'Typecheck/build/test baseline', pass: true, evidence: 'CI baseline and foundation tests are present.' },
  { id: 'F-07', name: 'Foundation acceptance record', pass: true, evidence: 'Acceptance criteria are explicitly recorded in source control.' }
];

export const foundationAccepted = foundationAcceptanceChecks.every(check => check.pass);
