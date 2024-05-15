import { useState } from "react";
import { SetState, createHook } from "./lib/createHook";

type State = { value: string; error: string; isSubmitting: boolean };

const initialState = { value: "", error: "", isSubmitting: false };

const submitValue = async (value: string) => {
  if (value === "xxxx") throw new Error("");
};

const formHandler =
  ({
    config,
    state,
    setState,
  }: {
    config: { submitter: typeof submitValue };
    state: State;
    setState: SetState<State>;
  }) =>
  (params: { initialValue: State["value"]; errorMessage: string }) => {
    const change = (value: string) => {
      setState((prev) => ({ ...prev, value }));
    };
    const submit = async (options?: { onError?: () => void }) => {
      setState((prev) => ({ ...prev, isSubmitting: true }));
      try {
        await config.submitter(state.value);
        setState((prev) => ({ ...prev, error: "", isSubmitting: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: params.errorMessage,
          isSubmitting: false,
        }));
        options?.onError?.();
      }
    };
    return { ...state, change, submit };
  };

const useForm = createHook(formHandler)({
  config: { submitter: submitValue },
  createState: ({ initialValue }) =>
    useState({ ...initialState, value: initialValue }),
});

export { useForm, formHandler };
