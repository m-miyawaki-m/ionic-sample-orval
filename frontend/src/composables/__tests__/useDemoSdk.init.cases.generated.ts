// AUTO-GENERATED – do not edit
// source target: composables/useDemoSdk#init
export const useDemoSdkInitCases = [
  {
    "id": "C1",
    "input": {
      "apiKey": "valid"
    },
    "mock": {
      "init": {
        "kind": "resolves",
        "value": {
          "ok": true
        }
      }
    },
    "expect": {
      "initialized": true,
      "lastError": {
        "code": null
      }
    }
  },
  {
    "id": "C2",
    "input": {
      "apiKey": ""
    },
    "mock": {
      "init": {
        "kind": "rejects",
        "code": "E_INVALID_KEY"
      }
    },
    "expect": {
      "initialized": false,
      "lastError": {
        "code": "E_INVALID_KEY"
      }
    }
  },
  {
    "id": "C3",
    "input": {
      "apiKey": "expired"
    },
    "mock": {
      "init": {
        "kind": "rejects",
        "code": "E_EXPIRED"
      }
    },
    "expect": {
      "initialized": false,
      "lastError": {
        "code": "E_EXPIRED"
      }
    }
  }
] as const
export type UseDemoSdkInitCase = (typeof useDemoSdkInitCases)[number]
