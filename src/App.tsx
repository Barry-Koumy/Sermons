import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import HomeScreen from './screens/HomeScreen';
import LibraryScreen from './screens/LibraryScreen';
import MoreScreen from './screens/MoreScreen';
import ContributeScreen from './screens/ContributeScreen';
import ReaderScreen from './screens/ReaderScreen';

export default function App() {
  return (
    <Routes>
      {/* Lecteur — hors shell, plein écran */}
      <Route path="/reader/:id" element={<ReaderScreen />} />

      {/* Shell avec bottom nav */}
      <Route element={<AppLayout />}>
        <Route index element={<HomeScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
        <Route path="/more" element={<MoreScreen />} />
        <Route path="/contribute" element={<ContributeScreen />} />
      </Route>
    </Routes>
  );
}
