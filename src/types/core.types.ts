export interface NodeOptions extends ArgsTreeOptions {
  id?: string;
  class?: string;
}

export interface ArgsTreeOptions {
  min?: number | null;
  max?: number | null;
  alias?: { [alias: string]: string | string[] | null | undefined };
  args?:
    | { [id: string]: NodeOptions | null | undefined }
    | ((arg: string) => NodeOptions | null | undefined);
}

export interface Node {
  id: string | null;
  class: string | null;
  depth: number;
  args: string[];
  parent: Node | null;
  children: Node[];
  ancestors: Node[];
  descendants: Node[];
}
