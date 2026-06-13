import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { eq } from "drizzle-orm";
import { buildEntitlements, resolveContentAccess } from "../content-access.js";
import {
  bankContentVersion,
  countTheoryByType,
  loadCodeFillBank,
  loadTheoryBank,
} from "../bank-loader.js";
import { sliceCodeFillBank, sliceTheoryBank } from "../bank-slice.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { isKnownBankId } from "../trial-config.js";

async function loadUser(sub: string) {
  const rows = await db.select().from(users).where(eq(users.id, sub)).limit(1);
  return rows[0] ?? null;
}

export async function registerBankRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler) {
  app.get(
    "/api/banks/:bankId/theory",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bankId } = request.params as { bankId: string };
      if (!isKnownBankId(bankId)) {
        return reply.code(404).send({ error: "题库不存在" });
      }

      const jwtUser = request.user as { sub: string };
      const row = await loadUser(jwtUser.sub);
      if (!row) return reply.code(401).send({ error: "用户不存在" });

      const access = resolveContentAccess(row);
      if (access === "blocked") {
        return reply.code(403).send({ error: "subscription_required" });
      }

      const full = loadTheoryBank(bankId);
      const typeCounts = countTheoryByType(full);
      const operateFull = loadCodeFillBank(bankId);
      const entitlements = buildEntitlements(
        access,
        { ...typeCounts, operate: operateFull.length },
        bankId !== "ai-trainer-l4"
      );
      const questions = sliceTheoryBank(full, access);
      const version = bankContentVersion(bankId);

      return reply.send({
        bankId,
        contentAccess: access,
        entitlements,
        version,
        questions,
      });
    }
  );

  app.get(
    "/api/banks/:bankId/code-fill",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bankId } = request.params as { bankId: string };
      if (!isKnownBankId(bankId)) {
        return reply.code(404).send({ error: "题库不存在" });
      }

      const jwtUser = request.user as { sub: string };
      const row = await loadUser(jwtUser.sub);
      if (!row) return reply.code(401).send({ error: "用户不存在" });

      const access = resolveContentAccess(row);
      if (access === "blocked") {
        return reply.code(403).send({ error: "subscription_required" });
      }

      const full = loadCodeFillBank(bankId);
      const theoryFull = loadTheoryBank(bankId);
      const typeCounts = countTheoryByType(theoryFull);
      const operateEnabled = bankId !== "ai-trainer-l4";
      const entitlements = buildEntitlements(
        access,
        { ...typeCounts, operate: full.length },
        operateEnabled
      );
      const questions = sliceCodeFillBank(full, access);
      const version = bankContentVersion(bankId);

      return reply.send({
        bankId,
        contentAccess: access,
        entitlements,
        version,
        questions,
      });
    }
  );
}
