# test-hook

리액트를 이용한 프로젝트에서는 커스텀 훅을 많이 작성하고, 훅에 대한 테스트를 작성하는 경우도 많습니다. 커스턴 훅을 테스트 하기 위해 [`testing-library`](https://testing-library.com/)의 [`renderHook`](https://testing-library.com/docs/react-testing-library/api/#renderhook)을 사용할 수 있지만, `renderHook`의 단점은 커스텀 훅 내에 존재하는 상태를 직접 변경할 수는 없다는 것입니다. 이를 해결할 수 있는 한가지 방법은 훅의 로직을 그래돌 가지고 있으면서, 부수 효과를 일으키는 모든 암묵적 입출력은 제거된 함수(순수함수)를 작성하고, 이 함수를 테스트하는 것입니다.

### 훅에서 순수함수 분리하기

예를 들어 아래와 같이 form을 핸들링하기 위해 `useForm`이라는 커스텀 훅을 작성할 수 있습니다.

```tsx
const useForm = () => {
  const [state, setState] = useState({
    value: "",
    error: "",
    isSubmitting: false,
  });
  const change = (value: string) => {
    setState((prev) => ({ ...prev, value }));
  };
  const submit = async () => {
    setState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await submitValue(state.value);
      setState((prev) => ({ ...prev, error: "", isSubmitting: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: "error", isSubmitting: false }));
    }
  };
  return { ...state, change, submit };
};

const Form = () => {
  const form = useForm();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit();
      }}
    >
      <input value={form.value} onChange={(e) => form.change(e.target.value)} />
      <p>{form.error}</p>
    </form>
  );
};
```

`renderHook`을 이용해 `useForm`에 대한 테스트를 작성할 수 있지만, `state`를 직접 설정할 수는 없기 때문에, 테스트를 작성하는데, 제약이 있을 수 밖에 없습니다. `useForm`에서 부수효과를 일으키는 `state`, `setState`, `submitValue`를 인자로 받을 수 있다면 함수를 작성하면, 이 함수는 `renderHook`이 없이도 충분히 테스트 할 수 있습니다. 아래의 `formHandler`은 `useForm`에서 암묵적인 입출력을 제거한 순수 함수입니다.

```tsx
type State = { value: string; error: string; isSubmitting: boolean };

type Params = {
  state: State;
  submitter: (value: State["value"]) => Promise<void>;
  setState: (set: (state: State) => State) => void;
};

const formHandler = ({ state, submitter, setState }: Params) => {
  const change = (value: string) => {
    setState((prev) => ({ ...prev, value }));
  };
  const submit = async () => {
    setState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await submitter(state.value);
      setState((prev) => ({ ...prev, error: "", isSubmitting: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: "error", isSubmitting: false }));
    }
  };
  return { ...state, change, submit };
};

const useForm = () => {
  const [state, setState] = useState<State>({
    value: "",
    error: "",
    isSubmitting: false,
  });
  return formHandler({ state, submitter: submitValue, setState: setState });
};
```

`formHandler`에 대한 테스트를 작성할 때 한가지 어려움이 있는데, `formHandler`는 `useForm`과는 다르게, 상태의 변경 사항이 다시 적용되지 않기 때문에, 테스트를 작성할 때 그렇게 될 수 있도록 코드를 작성해주어야 한다는 것입니다. 아래의 코드는, 이 문제를 해결하기 위해 작성한 코드의 일부분입니다. `useState`에 의해 생성되는 `state`와 `setState`의 역할을 대신 해줄 수 있는 객체와 함수를 만든 다음, `getResult`를 호출하면 갱신된 상태가 `formHandler`에 적용될 수 있도록 할 수 있습니다.

```tsx
test.each(testCases)(
  "$name",
  async ({ params, prevState, event, doExpect }) => {
    const state = { current: prevState };
    const setState: Params["setState"] = (set) => {
      state.current = set(state.current);
    };
    const getResult = (state: Params["state"]) =>
      formHandler({ ...params, state, setState });
    event?.(getResult(state.current));
    await doExpect(() => getResult(state.current));
  }
);
```

만약 시간 지연이 있는 비동기 함수의 호출을 테스트하고 싶은 경우에는 `[waitFor](https://testing-library.com/docs/dom-testing-library/api-async/#waitfor)` 내에서 `getResult`을 호출하면 됩니다. 다음은 `formHandler`의 비동기 함수인 `submit`을 테스트 하기 위한 코드입니다.

```tsx
type Params = Parameters<typeof formHandler>[0];
type Result = ReturnType<typeof formHandler>;

const createState = (state?: Partial<Params["state"]>): Params["state"] => ({
  value: "",
  error: "",
  isSubmitting: false,
  ...state,
});

const createParams = (params?: Partial<Params>): Params => ({
  state: createState(),
  submitter: async (value: string) => {
    await new Promise((r) => setTimeout(r, 100));
    if (value === "xxx") throw new Error("");
  },
  setState: () => undefined,
  ...params,
});

describe("formHandler", () => {
  type TestCases = {
    name: string;
    params: Params;
    prevState: Params["state"];
    event?: (result: Result) => void;
    doExpect: (getResult: () => Result) => Promise<void> | void;
  }[];
  const testCases: TestCases = [
    {
      name: "submit하는 경우",
      params: createParams(),
      prevState: createState({
        value: "a",
        isSubmitting: false,
        error: "error",
      }),
      event: (result) => {
        result.submit();
      },
      doExpect: async (getResult) => {
        expect(getResult().isSubmitting).toBe(true);
        await waitFor(() => {
          const { isSubmitting, error } = getResult();
          expect({ isSubmitting, error }).toEqual({
            isSubmitting: false,
            error: "",
          });
        });
      },
    },
  ];
  test.each(testCases)(
    "$name",
    async ({ params, prevState, event, doExpect }) => {
      const state = { current: prevState };
      const setState: Params["setState"] = (set) => {
        state.current = set(state.current);
      };
      const getResult = (state: Params["state"]) =>
        formHandler({ ...params, state, setState });
      event?.(getResult(state.current));
      await doExpect(() => getResult(state.current));
    }
  );
});
```

`createState`와 `createParams`는 테스트 케이스가 여러 개일 경우, 중복되는 입력값 설정을 피하기 위해 작성한 함수입니다. `createParams`에서 `state(): cretateState()` 와 `setState: () => undefined`는 사실상 무의미한 코드입니다. `test.each(testCase)(…)`내에서 덮어쓰게 될 것이기 때문입니다. `TestCase` 타입을 살펴보면 테스트의 흐름을 알 수 있습니다.

- `params`: 테스트에 필요한 데이터 및 함수를 설정합니다. (여기에서는 `submit`에 대한 mock 함수를 설정합니다.)
- `prevState`: ‘이전’ 상태를 설정합니다.
- `event`: 이벤트를 트리거합니다.
- `doExpect`: 트리거된 이벤트에 따라 상태 변경이 올바르게 이루어졌는지 확인합니다.

실제로 작성된 테스트를 살펴보면

- `params`: submit에 대한 mock 함수를 설정하고,
- `prevState`: ‘이전’ 상태가 `{ value: 'a', isSubmitting: false, error: 'error' }` 라고 가정하고,
- `event`: `submit` 을 호출합니다.
- `doExpect`: `submit`이 호출되면, 우선 `isSubmitting`이 먼저 `true`로 변경이 된 것을 확인하고, submit이 완료되면, `isSubmitting`이 다시 `false`로 변경되고, `error`에 빈문자열이 설정되는 것(정상적인 비동기 함수 호출이므로 에러가 발생되지 않았습니다)을 확인합니다.

`submit`은 시간 지연이 있는 비동기 함수이기 때문에, 결과를 확인하려면 `waitFo`r 내에서 결과를 확인해야 합니다. `waitFor`는 일정시간 간격으로 콜백 함수를 반복적으로 실행하기 때문에, 콜백 함수 내에서 `getResult`를 호출하면, `getResult`를 반복적으로 호출할 수 있어, 상태 변화를 확인할 수 있습니다.

### 반복되는 코드 함수화하기

많은 양의 훅을 이러한 방식으로 소스 코드와 테스트를 작성한다면, 반복되는 코드의 양의 상당히 많을 것입니다. 반복되는 코드를 분리해 함수화하면 이러한 불필요한 코드 작성을 피할 수 있을 것입니다. 먼저, 다음과 같이 `formHandler`와 같은 순수 함수를 훅으로 만들어주는 함수인 `createHook`를 작성할 수 있습니다.

```tsx
type SetState<S> = (set: (state: S) => S) => void;

type Handler<Config, State, Result> = (
  config: Config,
  state: State,
  setState: SetState<State>
) => Result;

const createHook =
  <Config, State, Result>(
    createState: () => [State, SetState<State>],
    config: Config,
    handler: Handler<Config, State, Result>
  ) =>
  () => {
    const [state, setState] = createState();
    return handler(config, state, setState);
  };
```

`createState`는 `useState`의 리턴값을 리턴하는 함수이고, `config`는 함수 본문에서 사용될 비동기 함수와 같은 암묵적 입출력이며, `handler`는 훅으로 변환할 순수 함수입니다. `createHook`을 사용하면 다음과 같이 훅의 순수 함수 부분을 완전히 분리해서 작성할 수 있습니다.

```tsx
const initState: State = { value: "", error: "", isSubmitting: false };

const formHandler = (
  config: { submitter: (value: State["value"]) => Promise<void> },
  state: State,
  setState: SetState<State>
) => { ... };

const useForm = createHook(
  () => useState<State>(initState),
  { submitter: submitValue },
  formHandler
);
```

훅으로 변환할 순수 함수를 테스트하기 위한 함수도 작성한다면 반복되는 코드의 양을 줄일 수 있을 것입니다.

```tsx
type TestCase<Config, State, Result> = {
  name: string;
  config?: Partial<Config>;
  prevState?: Partial<State>;
  event?: (result: Result) => void;
  doExpect: (getResult: () => Result) => Promise<void> | void;
};

const hookTest = <Config, State, Result>(params: {
  name: string;
  handler: Handler<Config, State, Result>;
  defaultConfig: Config;
  defaultState: State;
  testCases: TestCase<Config, State, Result>[];
}) => {
  const { name, handler, defaultConfig, defaultState, testCases } = params;
  const createState = (state?: Partial<State>): State => ({
    ...defaultState,
    ...state,
  });
  const createConfig = (config?: Partial<Config>): Config => ({
    ...defaultConfig,
    ...config,
  });
  describe(name, () => {
    test.each(testCases)(
      "$name",
      async ({ config, prevState, event, doExpect }) => {
        const state = { current: createState(prevState) };
        const setState: SetState<State> = (set) => {
          state.current = set(state.current);
        };
        const getResult = (state: State) =>
          handler(createConfig(config), state, setState);
        event?.(getResult(state.current));
        await doExpect(() => getResult(state.current));
      }
    );
  });
};
```

`hookTest`를 사용하면 구체적인 구현에 신경쓰지 않고 테스트를 작성할 수 있습니다.

```tsx
hookTest({
  name: "useForm 테스트",
  handler: formHandler,
  defaultConfig: {
    submitter: async (value: string) => {
      await new Promise((r) => setTimeout(r, 100));
      if (value === "xxx") throw new Error("");
    },
  },
  defaultState: { value: "", error: "", isSubmitting: false },
  testCases: [
    {
      name: "값을 변경하는 경우",
      event: (result) => {
        result.change("a");
      },
      doExpect: (getResult) => {
        expect(getResult().value).toBe("a");
      },
    },
    {
      name: "submit 하는 경우",
      prevState: { value: "a", isSubmitting: false, error: "error" },
      event: (result) => {
        result.submit();
      },
      doExpect: async (getResult) => {
        expect(getResult().isSubmitting).toBe(true);
        await waitFor(() => {
          const { isSubmitting, error } = getResult();
          expect({ isSubmitting, error }).toEqual({
            isSubmitting: false,
            error: "",
          });
        });
      },
    },
    {
      name: "submit을 할 때 에러가 발생하는 경우",
      prevState: { value: "xxx", isSubmitting: false, error: "" },
      event: (result) => {
        result.submit();
      },
      doExpect: async (getResult) => {
        expect(getResult().isSubmitting).toBe(true);
        await waitFor(() => {
          const { isSubmitting, error } = getResult();
          expect({ isSubmitting, error }).toEqual({
            isSubmitting: false,
            error: "error",
          });
        });
      },
    },
  ],
});
```

### 확장하기

`createHook`과 `hookTest`는 매우 유용한 도구이지만, 매개변수를 가지고 있거나 `useRef`를 사용하는 훅에 대해서도 사용할 수 있게 하기 위해서는, 코드를 좀 더 추가해야 합니다. 먼저, `useRef`를 `useState` 처럼 다룰 수 있도록 `useRefState`라는 커스텀 훅을 작성합니다.

```tsx
type SetRef<R> = SetState<R>;

const useRefState = <Ref,>(initRef: Ref): [Ref, SetRef<Ref>] => {
  const ref = useRef(initRef);
  const setRef = (set: (prev: Ref) => Ref) => {
    ref.current = set(ref.current);
  };
  return [ref.current, setRef];
};
```

그리고 `createHook`을 확장해 매개변수를 가지고 있고 `useRefState`를 사용하는 훅을 생성할 수 있도록 합니다.

```tsx
type CreateState<Params, S> = (params: Params) => [S, SetState<S>];

type CreateRef<Params, R> = CreateState<Params, R>;

type Handler<Params, Config, State, Ref, Result> = (handlerParams: {
  config: Config;
  state: State;
  setState: SetState<State>;
  ref: Ref;
  setRef: SetRef<Ref>;
}) => (params: Params) => Result;

const createHook =
  <Params = void, Config = void, State = void, Ref = void, Result = void>(
    handler: Handler<Params, Config, State, Ref, Result>
  ) =>
  (
    hookParams: (Config extends void ? {} : { config: Config }) &
      (State extends void ? {} : { createState: CreateState<Params, State> }) &
      (Ref extends void ? {} : { createRef: CreateRef<Params, Ref> })
  ) =>
  (params: Params) => {
    const config =
      "config" in hookParams ? hookParams.config : (undefined as Config);
    const [state, setState] =
      "createState" in hookParams
        ? hookParams.createState(params)
        : ([] as unknown as ReturnType<CreateState<Params, State>>);
    const [ref, setRef] =
      "createRef" in hookParams
        ? hookParams.createRef(params)
        : ([] as unknown as ReturnType<CreateState<Params, Ref>>);
    return handler({ config, state, setState, ref, setRef })(params);
  };
```

커스텀 훅의 매개변수(`params`)를 입력받을 수 있고 `useRefState`의 리턴값을 리턴하는 `createRef`를 추가하고, `createState`는 `params`를 입력받을 수 있도록 변경되었습니다. 모든 매개변수는 사용되지 않을 가능성이 있는데, 그러한 경우 `undefined`를 입력하는 대신, 아무것도 입력하지 않도록 하기 위해, 객체 형태로 입력을 할 수 있도록 변경했습니다.

확장된 `createHook`은 다음과 같이 사용될 수 있습니다.

```tsx
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
  () => { ... };

const useForm = createHook(formHandler)({
  config: { submitter: submitValue },
  createState: () => useState(initState),
});
```

`formHandler`가 객체의 형태로 `config`, `state`, `setState`를 입력 받고, `(params: Params) => Reseult` 형태로 리턴하며, `createHook`도 객체의 형태로 `config`와 `createState`를 입력 받는다는 것을 제외하면, 기존과 큰 차이는 없습니다. 사용하지 않는 `useRefState`와 `params`와 관련된 변수는 사용되지 않았기 때문입니다.

`createHook`이 수정되었기 때문에, 그에 맞춰 `hookTest`도 수정되어야 합니다.

```tsx
import { describe, test, Mock, vi } from "vitest";

type Mocks = Record<string, Mock>;

type TestCase<Params, Config, State, Ref, Result> = {
  name: string;
  params?: Partial<Params>;
  config?: Partial<Config>;
  prevState?: Partial<State>;
  prevRef?: Partial<Ref>;
  mocks?: Mocks;
  event?: (p: { result: Result; mocks: Mocks }) => void;
  doExpect: (p: {
    getResult: () => Result;
    params: Params;
    mocks: Mocks;
  }) => Promise<void> | void;
};

const mergeObj =
  <O,>(obj: O) =>
  (partialObj?: Partial<O>): O => ({ ...obj, ...partialObj });

const hookTest =
  <Params = void, Config = void, State = void, Ref = void, Result = void>(
    handler: Handler<Params, Config, State, Ref, Result>
  ) =>
  (
    p: {
      name: string;
      testCases: Array<TestCase<Params, Config, State, Ref, Result>>;
    } & (Params extends void ? {} : { defaultParams: Params }) &
      (Config extends void ? {} : { defaultConfig: Config }) &
      (State extends void ? {} : { defaultState: State }) &
      (Ref extends void ? {} : { defaultRef: Ref })
  ) => {
    const defaultParams =
      "defaultParams" in p ? p.defaultParams : (undefined as Params);
    const defaultConfig =
      "defaultConfig" in p ? p.defaultConfig : (undefined as Config);
    const defaultState =
      "defaultState" in p ? p.defaultState : (undefined as State);
    const defaultRef = "defaultRef" in p ? p.defaultRef : (undefined as Ref);

    const { name, testCases } = p;
    const createParams = mergeObj(defaultParams);
    const createConfig = mergeObj(defaultConfig);
    const createState = mergeObj(defaultState);
    const createRef = mergeObj(defaultRef);

    describe(name, () => {
      test.each(testCases)(
        "$name",
        async ({
          params,
          config,
          prevState,
          prevRef,
          mocks = { _: vi.fn() },
          event,
          doExpect,
        }) => {
          const state = { current: createState(prevState) };
          const ref = { current: createRef(prevRef) };
          const setState: SetState<State> = (set) => {
            state.current = set(state.current);
          };
          const setRef: SetRef<Ref> = (set) => {
            ref.current = set(ref.current);
          };
          const getResult = (state: State, ref: Ref) =>
            handler({
              config: createConfig(config),
              state,
              setState,
              ref,
              setRef,
            })(createParams(params));
          event?.({ result: getResult(state.current, ref.current), mocks });
          await doExpect({
            getResult: () => getResult(state.current, ref.current),
            params: createParams(params),
            mocks,
          });
        }
      );
    });
  };
```

수정된 `TestCase`을 보면 알 수 있듯이, 기존의 `hookTest`에 `params`와 `prevRef`가 추가되고, `doExpect`에서도 `params`에 접근할 수 있습니다. 그런데 `mocks`는 뭘까요? `mocks`에서는 `event` 내에서 호출되고 `doExpect` 내에서 확인해야 하는 모든 mock 함수를 정의할 수 있습니다. 예를 들어, 다음과 같이 사용될 수 있습니다.

```tsx
{
  name: "submit의 onSuccess 호출되는지 확인",
  mocks: { onSuccess: vi.fn() }
  event: ({ result, mocks }) => {
    result.submit({ onSuccess: mocks.onSuccess });
  },
  doExpect: async ({ getResult, mocks }) => {
    expect(mocks.onSuccess).toHaveBeenCalled()
  },
}
```
