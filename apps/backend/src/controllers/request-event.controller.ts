import type { RequestHandler } from "express";
import {
  getRequestEvent,
  listRequestEvents,
  renormalizeRequestEvent
} from "../services/request-event.service.js";
import { createSuccessResponse } from "../utils/api-response.js";
import {
  getRequestEventSearchHealth,
  searchRequestEvents
} from "../services/request-event-search.service.js";

export const listEvents: RequestHandler = async (request, response) => {
  const events = await listRequestEvents(request.query);
  response.json(createSuccessResponse(events));
};

export const getEvent: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await getRequestEvent(String(request.params.id))));
};

export const normalizeEvent: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await renormalizeRequestEvent(String(request.params.id))));
};

export const searchEvents: RequestHandler = async (request, response) => {
  response.json(
    createSuccessResponse(
      await searchRequestEvents({
        q: request.query.q as string | undefined,
        protectedServiceId: request.query.protectedServiceId as string | undefined,
        source: request.query.source as never,
        simulationId: request.query.simulationId as string | undefined,
        classification: request.query.classification as never,
        category: request.query.category as never,
        action: request.query.action as never,
        from: request.query.from ? new Date(String(request.query.from)) : undefined,
        to: request.query.to ? new Date(String(request.query.to)) : undefined,
        limit: request.query.limit ? Number(request.query.limit) : undefined,
        offset: request.query.offset ? Number(request.query.offset) : undefined
      })
    )
  );
};

export const searchHealth: RequestHandler = async (_request, response) => {
  response.json(createSuccessResponse(await getRequestEventSearchHealth()));
};
