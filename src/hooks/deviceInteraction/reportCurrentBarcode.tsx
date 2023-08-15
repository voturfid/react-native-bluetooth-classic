import React, {
  createContext,
  ReactNode,
  useContext,
  useReducer,
} from 'react';
import { TypeControlTagsAnalyseProps } from './controlTags';

interface ReportCurrentBarcodeProviderProps {
  children: ReactNode;
}

export type ReportCurrentBarcodeProps = {
  currentRead: string;
};

export type BarcodeProps = {
  barcode?: string;
};

type BarcodeAnalyzeReportProps = {
  data?: BarcodeProps;
  type?: TypeControlTagsAnalyseProps;
};

interface ReportCurrentBarcodeData {
  handleAnalyzeReportCurrentReadBarcode: (
    analyze: BarcodeAnalyzeReportProps
  ) => void;
  currentReadBarcode: ReportCurrentBarcodeProps;
}

const ReportCurrentBarcodeContext = createContext<ReportCurrentBarcodeData>(
  {} as ReportCurrentBarcodeData
);

function ReportCurrentReadBarcodeProvider({
  children,
}: ReportCurrentBarcodeProviderProps) {
  const operationReport = {
    new: (barcode = ''): ReportCurrentBarcodeProps => {
      const isBarcode13Digit = barcode.length === 13;
      if (isBarcode13Digit) {
        return { currentRead: barcode };
      }

      return { currentRead: '' };
    },

    clear: (_ = ''): ReportCurrentBarcodeProps => {
      return { currentRead: '' };
    },
    default: (barcode = ''): ReportCurrentBarcodeProps => {
      return { currentRead: barcode };
    },
  };

  const [currentReadBarcode, toAnalyze] = useReducer(handleAnalyze, {
    currentRead: '',
  } as ReportCurrentBarcodeProps);

  function handleAnalyze(
    _: ReportCurrentBarcodeProps,
    { data = { barcode: '' }, type = 'default' }: BarcodeAnalyzeReportProps
  ) {
    return operationReport[type](data.barcode);
  }

  function handleAnalyzeReportCurrentReadBarcode(
    analyze: BarcodeAnalyzeReportProps
  ) {
    toAnalyze(analyze);
  }
  return (
    <ReportCurrentBarcodeContext.Provider
      value={{
        handleAnalyzeReportCurrentReadBarcode,
        currentReadBarcode,
      }}
    >
      {children}
    </ReportCurrentBarcodeContext.Provider>
  );
}

const useReportCurrentReadBarcode = () => {
  const context = useContext(ReportCurrentBarcodeContext);
  return context;
};

export { ReportCurrentReadBarcodeProvider, useReportCurrentReadBarcode };
