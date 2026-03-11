export interface RolePack {
  name: string;
  version: string;
  description: string;
  role: string;
  prompt: string;
  instructions: string[];
  skills: string[];
}

export interface LoadedRolePack extends RolePack {
  id: string;
  fileName: string;
  filePath: string;
  raw: string;
}
