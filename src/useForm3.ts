import { useRef, useState } from "react";

type SetState<S> = (set: (state: S) => S) => void;

type SetRef<R> = SetState<R>;

type CreateState<Params, S> = (params: Params) => [S, SetState<S>];

type CreateRef<Params, R> = CreateState<Params, R>;

type Handler<Params, Config, State, Ref, Result> = (
  params: Params
) => (
  config: Config
) => (
  state: State,
  setState: SetState<State>
) => (ref: Ref, setRef: SetRef<Ref>) => Result;

const createHook =
  <Params, Config, State, Ref, Result>(
    createState: CreateState<Params, State>,
    createRef: CreateRef<Params, Ref>,
    config: Config,
    handler: Handler<Params, Config, State, Ref, Result>
  ) =>
  (params: Params) => {
    const [state, setState] = createState(params);
    const [ref, setRef] = createRef(params);
    return handler(params)(config)(state, setState)(ref, setRef);
  };

const placeholders = {
  createState: <CreateState<unknown, unknown>>(
    (() => [undefined, () => undefined])
  ),
  createRef: <CreateRef<unknown, unknown>>(() => [undefined, () => undefined]),
  config: undefined,
} as const;

const useRefState = <Ref>(initRef: Ref): [Ref, SetRef<Ref>] => {
  const ref = useRef(initRef);
  const setRef = (set: (prev: Ref) => Ref) => {
    ref.current = set(ref.current);
  };
  return [ref.current, setRef];
};

////

const submitValue = async (value: string) => {
  if (value === "xxx") throw new Error("");
};

type State = { value: string; error: string; isSubmitting: boolean };

const initState: State = { value: "", error: "", isSubmitting: false };

const formHandler =
  () =>
  (config: { submitter: typeof submitValue }) =>
  (state: State, setSate: SetState<State>) =>
  () => {
    const change = (value: string) => {
      setSate((prev) => ({ ...prev, value }));
    };
    const submit = async () => {
      setSate((prev) => ({ ...prev, isSubmitting: true }));
      try {
        await config.submitter(state.value);
        setSate((prev) => ({ ...prev, error: "", isSubmitting: false }));
      } catch (error) {
        setSate((prev) => ({ ...prev, error: "error", isSubmitting: false }));
      }
    };
    return { ...state, change, submit };
  };

const useForm = createHook(
  () => useState(initState),
  placeholders.createRef,
  { submitter: submitValue },
  formHandler
);

export type { Handler, SetState };

export { useForm, formHandler };
