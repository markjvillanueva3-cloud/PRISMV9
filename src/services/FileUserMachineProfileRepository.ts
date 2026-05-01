import * as fs from "fs/promises";
import * as path from "path";

import { PATHS } from "../constants.js";
import type {
  MachineOptionSource,
  PersistUserMachineProfileInput,
  PersistUserMachineProfileResult,
  UserMachineProfileConsumer,
  UserMachineProfileReadModel,
} from "../contracts/userMachineProfile.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import {
  buildUserMachineProfileReadModel,
  type UserMachineProfileRepository,
} from "./UserMachineProfileService.js";

const STORE_VERSION = 1;

interface StoredUserMachineProfileRecord {
  profile: UserMachineProfileReadModel;
  consumer: UserMachineProfileConsumer;
  source: MachineOptionSource;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface DefaultUserMachineProfilePointer {
  userId: string;
  consumer: UserMachineProfileConsumer;
  workspaceId?: string;
  profileId: string;
  updatedAt: string;
}

interface UserMachineProfileStore {
  version: number;
  profiles: Record<string, StoredUserMachineProfileRecord>;
  defaults: DefaultUserMachineProfilePointer[];
}

function normalizeWorkspaceId(workspaceId?: string): string {
  return workspaceId?.trim() ?? "";
}

function buildEmptyStore(): UserMachineProfileStore {
  return {
    version: STORE_VERSION,
    profiles: {},
    defaults: [],
  };
}

function resolveStorePath(): string {
  return process.env.PRISM_USER_MACHINE_PROFILE_STORE_PATH
    || path.join(
      PATHS.STATE_DIR,
      "operating-system",
      "user-machine-profiles",
      "profiles.json",
    );
}

function matchesDefaultPointer(
  pointer: DefaultUserMachineProfilePointer,
  userId: string,
  consumer: UserMachineProfileConsumer,
  workspaceId?: string,
): boolean {
  return (
    pointer.userId === userId
    && pointer.consumer === consumer
    && normalizeWorkspaceId(pointer.workspaceId) === normalizeWorkspaceId(workspaceId)
  );
}

export class FileUserMachineProfileRepository implements UserMachineProfileRepository {
  private async readStore(): Promise<UserMachineProfileStore> {
    try {
      const raw = await fs.readFile(resolveStorePath(), "utf-8");
      const parsed = JSON.parse(raw) as Partial<UserMachineProfileStore>;
      return {
        version: STORE_VERSION,
        profiles: parsed.profiles ?? {},
        defaults: Array.isArray(parsed.defaults) ? parsed.defaults : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return buildEmptyStore();
      }
      throw error;
    }
  }

  private async writeStore(store: UserMachineProfileStore): Promise<void> {
    const storePath = resolveStorePath();
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await atomicWrite(storePath, JSON.stringify(store, null, 2));
  }

  async getByProfileId(profileId: string): Promise<UserMachineProfileReadModel | null> {
    const store = await this.readStore();
    return store.profiles[profileId]?.profile ?? null;
  }

  async getDefaultProfile(
    userId: string,
    consumer: UserMachineProfileConsumer,
    workspaceId?: string,
  ): Promise<UserMachineProfileReadModel | null> {
    const store = await this.readStore();
    const exactPointer = store.defaults.find((pointer) =>
      matchesDefaultPointer(pointer, userId, consumer, workspaceId),
    );
    const fallbackPointer = store.defaults.find((pointer) =>
      pointer.userId === userId
      && pointer.consumer === consumer
      && !normalizeWorkspaceId(pointer.workspaceId),
    );
    const resolvedPointer = exactPointer ?? fallbackPointer;

    if (!resolvedPointer) {
      return null;
    }

    return store.profiles[resolvedPointer.profileId]?.profile ?? null;
  }

  async upsert(
    input: PersistUserMachineProfileInput,
  ): Promise<PersistUserMachineProfileResult> {
    const store = await this.readStore();
    const existing = store.profiles[input.profile.profileId];
    const currentVersion = existing?.version ?? 0;

    if (
      input.expectedVersion !== undefined
      && input.expectedVersion !== currentVersion
    ) {
      throw new Error(
        `Version mismatch for user machine profile ${input.profile.profileId}. `
        + `Expected ${input.expectedVersion}, found ${currentVersion}.`,
      );
    }

    const now = new Date().toISOString();
    const readModel = buildUserMachineProfileReadModel(input.profile);
    const nextVersion = currentVersion + 1;
    const hadDefaultForScope = store.defaults.some((pointer) =>
      matchesDefaultPointer(
        pointer,
        input.profile.userId,
        input.consumer,
        input.profile.workspaceId,
      ),
    );
    const shouldDefault = input.makeDefault === true || !hadDefaultForScope;

    store.profiles[input.profile.profileId] = {
      profile: readModel,
      consumer: input.consumer,
      source: input.source,
      version: nextVersion,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (shouldDefault) {
      store.defaults = store.defaults.filter((pointer) =>
        !matchesDefaultPointer(
          pointer,
          input.profile.userId,
          input.consumer,
          input.profile.workspaceId,
        ),
      );
      store.defaults.push({
        userId: input.profile.userId,
        consumer: input.consumer,
        workspaceId: input.profile.workspaceId,
        profileId: input.profile.profileId,
        updatedAt: now,
      });
    }

    await this.writeStore(store);

    return {
      profile: readModel,
      created: !existing,
      updated: Boolean(existing),
      version: nextVersion,
      defaulted: shouldDefault,
    };
  }
}

export const fileUserMachineProfileRepository = new FileUserMachineProfileRepository();
