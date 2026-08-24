import { describe, it, expect } from "vitest";
import { parseAfroidDSL } from "../index";

describe("Afroid DSL Parser", () => {
  it("should parse a complete startup specification into an AST", () => {
    const dslCode = `
      project AgriPay {
        description: "Agricultural micro-payments in East Africa"

        entity Farmer {
          id: uuid
          phoneNumber: string unique
          fullName: string
          acres: int optional
        }

        service PaymentService {
          type: fastapi
          port: 8001
          use Farmer
          endpoint POST /v1/charge {
            auth: true
            summary: "Initiate M-Pesa push charge"
          }
        }
      }
    `;

    const ast = parseAfroidDSL(dslCode);

    expect(ast.projectName).toBe("AgriPay");
    expect(ast.description).toBe("Agricultural micro-payments in East Africa");
    expect(ast.entities.length).toBe(1);

    const farmer = ast.entities[0];
    expect(farmer.name).toBe("Farmer");
    expect(farmer.tableName).toBe("farmers");
    expect(farmer.fields.length).toBe(4);
    expect(farmer.fields.find((f) => f.name === "phoneNumber")?.isUnique).toBe(true);
    expect(farmer.fields.find((f) => f.name === "acres")?.isOptional).toBe(true);

    expect(ast.services.length).toBe(1);
    const svc = ast.services[0];
    expect(svc.name).toBe("PaymentService");
    expect(svc.type).toBe("fastapi");
    expect(svc.port).toBe(8001);
    expect(svc.entities).toContain("Farmer");
    expect(svc.endpoints.length).toBe(1);
    expect(svc.endpoints[0].method).toBe("POST");
    expect(svc.endpoints[0].path).toBe("/v1/charge");
    expect(svc.endpoints[0].requiresAuth).toBe(true);
  });
});
