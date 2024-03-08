export interface NodeOptions extends ArgsTreeOptions {
  id?: string;
}

export interface ArgsTreeOptions {
  min?: number | null;
  max?: number | null;
  alias?: { [alias: string]: string | string[] | null | undefined };
  args?:
    | { [id: string]: NodeOptions | null | undefined }
    | ((arg: string) => NodeOptions | null | undefined);
}

export interface Node extends Omit<Tree, 'id'> {
  id: string;
}

export interface Tree {
  id: null;
  args?: string[];
  nodes?: Node[];
}
