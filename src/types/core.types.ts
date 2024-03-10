export interface Options {
  id?: string;
  name?: string;
  class?: string;
  min?: number | null;
  max?: number | null;
  alias?: { [alias: string]: string | string[] | null | undefined };
  args?:
    | { [id: string]: Options | null | undefined }
    | ((arg: string) => Options | null | undefined);
}

export interface Node {
  id: string | null;
  name: string | null;
  class: string | null;
  depth: number;
  args: string[];
  parent: Node | null;
  children: Node[];
  ancestors: Node[];
  descendants: Node[];
}
