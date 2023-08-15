import { IEpcProps, IMessageFromDevice } from "../../index";
import { AccumulateMessageProps } from "./IProtocol";


type ResponseMergeProps = [IMessageFromDevice[], Set<string>];

export const mergeMessagesFromDevice = (
  messages: AccumulateMessageProps[]
): ResponseMergeProps => {
  const mergedIds: string[] = [];
  const groupedMessages: Record<string, AccumulateMessageProps[]> = {};

  for (const message of messages) {
    const command = message.message.command;
    if (!groupedMessages[command]) {
      groupedMessages[command] = [message];
    } else {
      groupedMessages[command]?.push(message);
    }
  }

  const mergedMessages = Object.values(groupedMessages).map((group) => {
    const latestMessage = group.reduce((prev, current) =>
      prev.timestamp > current.timestamp ? prev : current
    );

    const mergedMessage = { ...latestMessage.message };

    const ids = group.map((msg) => msg.id);
    mergedIds.push(...ids);

    const tags: IEpcProps[] = [];
    const flattenedTags = group.flatMap((msg) => msg.message.tags || []);
    const tagsSet = new Set<string>();

    for (const tag of flattenedTags) {
      if (!tagsSet.has(tag.epc)) {
        tagsSet.add(tag.epc);
        tags.push(tag);
      }
    }

    return {
      ...mergedMessage,
      tags,
    } as IMessageFromDevice & { tags: IEpcProps[] };
  });

  return [mergedMessages, new Set(mergedIds)];
};
