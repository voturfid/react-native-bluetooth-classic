type OnlyNewTagsProps = {
  tagsArray: Set<string>;
  currentRead?: string[];
};

export function getOnlyNewTags({
  tagsArray,
  currentRead = [],
}: OnlyNewTagsProps): string[] {
  return currentRead.filter((tag) => !tagsArray.has(tag));
}
