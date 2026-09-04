import { Provider } from "react-redux";
import { store } from "./app/store";
import { Router } from "./app/router";
import { ToastProvider } from "./components/ui/Toast";

export default function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </Provider>
  );
}
