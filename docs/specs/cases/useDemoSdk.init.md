---
target: composables/useDemoSdk#init
generator: vitest-cases
out:
  ts: frontend/src/composables/__tests__/useDemoSdk.init.cases.generated.ts
---

# useDemoSdk.init 決定表

| case_id | input.apiKey | mock.init               | expect.initialized | expect.lastError.code |
|---------|--------------|-------------------------|--------------------|------------------------|
| C1      | "valid"      | resolves {"ok":true}    | true               | null                   |
| C2      | ""           | rejects E_INVALID_KEY   | false              | E_INVALID_KEY          |
| C3      | "expired"    | rejects E_EXPIRED       | false              | E_EXPIRED              |
