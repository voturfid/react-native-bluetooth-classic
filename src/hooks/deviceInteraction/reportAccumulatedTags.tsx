import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import { IEpcProps } from '../../bluetooth/index';
import {
  ReadCommunProps,
  TypeControlTagsAnalyseProps,
} from './controlTags';
import { getOnlyNewTags } from '../../utils/getOnlyNewTags';

interface ReportAccumulatedTagsProviderProps {
  children: ReactNode;
}

type TagAnalyzeReportProps = {
  data?: ReadCommunProps;
  type?: TypeControlTagsAnalyseProps;
};

export type TagReportAccumulatedProps = {
  accumulated: Set<string>;
  newTags?: string[];
};

interface ReportAccumulatedTagsData {
  handleAnalyzeReportAccumulatedTags: (analyze: TagAnalyzeReportProps) => void;
  accumulatedTags: TagReportAccumulatedProps;
}

const ReportAccumulatedTagsContext = createContext<ReportAccumulatedTagsData>(
  {} as ReportAccumulatedTagsData
);

function ReportAccumulatedTagsProvider({
  children,
}: ReportAccumulatedTagsProviderProps) {
  const operationReport = {
    new: (
      state: TagReportAccumulatedProps,
      tags: IEpcProps[]
    ): TagReportAccumulatedProps => {
      const accumulated = new Set<string>(state.accumulated);

      const newTags = getOnlyNewTags({
        tagsArray: accumulated,
        currentRead: tags.map((tag) => tag.epc),
      });

      for (const epc of newTags) {
        accumulated.add(epc);
      }
      return { accumulated, newTags };
    },
    clear: (
      _state: TagReportAccumulatedProps,
      _tags: IEpcProps[]
    ): TagReportAccumulatedProps => {
      return { accumulated: new Set<string>() };
    },
    default: (
      state: TagReportAccumulatedProps,
      _tags: IEpcProps[]
    ): TagReportAccumulatedProps => {
      return state;
    },
  };

  function handleAnalyze(
    state: TagReportAccumulatedProps,
    { data = { epcs: [] }, type = 'default' }: TagAnalyzeReportProps
  ) {
    return operationReport[type](state, data.epcs);
  }

  const [tagsReportAccumulated, toAnalyze] = useReducer(handleAnalyze, {
    accumulated: new Set<string>(),
  } as TagReportAccumulatedProps);

  const tagsReportAccumulatedMemo = useMemo(
    () => tagsReportAccumulated,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tagsReportAccumulated.accumulated.size]
  );

  function handleAnalyzeReportAccumulatedTags(analyze: TagAnalyzeReportProps) {
    // if (analyze.type === 'clear') {
    // }
    return toAnalyze(analyze);

    // const analyzeEpcs = analyze.data ? analyze.data.epcs : [];

    // toAnalyze({ data: { epcs: analyzeEpcs }, type: analyze.type });
  }

  return (
    <ReportAccumulatedTagsContext.Provider
      value={{
        handleAnalyzeReportAccumulatedTags,
        accumulatedTags: tagsReportAccumulatedMemo,
      }}
    >
      {children}
    </ReportAccumulatedTagsContext.Provider>
  );
}

const useReportAccumulatedTags = () => {
  const context = useContext(ReportAccumulatedTagsContext);
  return context;
};

export { ReportAccumulatedTagsProvider, useReportAccumulatedTags };
