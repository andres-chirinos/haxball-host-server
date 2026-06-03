import { PrismaClient } from "@prisma/client";
import { createLogger } from "./logger";

export interface CommandContext {
  player: any;
  room: any;
  args: string[];
  reply: (message: string) => void;
  replyPrivate: (message: string) => void;
  db: PrismaClient;
  dbPlayer: any; // El jugador desde la base de datos (con su rol)
  getCommandHelp: (cmdName?: string) => string;
}

export type CommandHandler = (ctx: CommandContext) => void | Promise<void>;

export class Plugin {
  name: string;
  commands: Map<string, { handler: CommandHandler, hideTrigger: boolean, permissions?: string[], description?: string, usage?: string }>;
  events: Map<string, Array<(event: any, ctx: any) => void>>;
  apiRoutes: Array<(app: any) => void>;
  logger: ReturnType<typeof createLogger>;

  constructor(name: string) {
    this.name = name;
    this.commands = new Map();
    this.events = new Map();
    this.apiRoutes = [];
    this.logger = createLogger(name);
  }

  command(name: string | string[], options: { hideTrigger?: boolean, permissions?: string[], description?: string, usage?: string } = {}, handler: CommandHandler) {
    const hideTrigger = options.hideTrigger ?? false; // Default visible trigger
    const names = Array.isArray(name) ? name : [name];
    for (const n of names) {
      this.commands.set(n.toLowerCase(), { handler, hideTrigger, permissions: options.permissions, description: options.description, usage: options.usage });
    }
  }

  on(eventName: string, handler: (event: any, ctx: any) => void) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName)!.push(handler);
  }

  api(handler: (app: any) => void) {
    this.apiRoutes.push(handler);
  }
}
