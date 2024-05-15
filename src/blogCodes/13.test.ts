{
  name: "submit의 onSuccess 호출되는지 확인",
  mocks: { onSuccess: vi.fn() }
  event: ({ result, mocks }) => {
    result.submit({ onSuccess: mocks.onSuccess });
  },
  doExpect: async ({ getResult, mocks }) => {
    expect(mocks.onSuccess).toHaveBeenCalled()
  },
},