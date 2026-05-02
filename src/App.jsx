
import React, { useState, useEffect } from 'react';
import { HeaderLayout } from './layouts/HeaderLayout';
import StrategicView from './components/StrategicView';
import RiskMatrix from './components/RiskMatrix';
import { PDSAManager } from './components/modules/PDSAManager/PDSAManager';
import RadarRiscos from './components/RadarRiscos';
import { FinancialService } from './services/dataService';
import VarianceView from './components/VarianceView';
function App() {
  const [activeTab, setActiveTab] = useState('strategic');
  const [monthRef, setMonthRef] = useState('2025-02'); // Default month
  const [availableMonths, setAvailableMonths] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [dashboardData, setDashboardData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [allPDSAs, setAllPDSAs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const months = await FinancialService.getAvailableMonths();
      const structure = await FinancialService.getPDSAStructure();

      setAvailableMonths(months);
      if (structure && structure.grupos) {
        setGrupos(structure.grupos);
      }

      if (months.length > 0 && !monthRef) {
        setMonthRef(months[0]); // Select most recent by default
      }
    };
    init();
  }, []);

  useEffect(() => {
    // Always call loadData, even if monthRef is "" (Todos os meses)
    // Wait for availableMonths to load so we don't fetch before the initial month is set, 
    // unless they explicitly selected empty.
    if (monthRef !== null) {
      loadData();
    }
  }, [monthRef]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch datasets concurrently
      const [dash, anom, pdsas] = await Promise.all([
        FinancialService.getDashboardData(monthRef),
        FinancialService.getAnomalies(monthRef),
        FinancialService.getPDSAList("TODOS", "")
      ]);
      setDashboardData(dash);
      setAnomalies(anom || []);
      setAllPDSAs(pdsas || []);
    } catch (e) {
      console.error("Falha ao carregar:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e) => {
    setMonthRef(e.target.value);
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'strategic':
        return <StrategicView data={dashboardData} loading={loading} />;

      case 'variance':
        return <VarianceView data={dashboardData} loading={loading} />;

      case 'risk':
        return <RadarRiscos data={dashboardData} monthRef={monthRef} meses={availableMonths} grupos={grupos} pdsaList={allPDSAs} />;

      case 'pdsa':
        return <PDSAManager data={dashboardData} monthRef={monthRef} />;


      default:
        return null;
    }
  };

  return (
    <HeaderLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      monthRef={monthRef}
      onMonthChange={handleMonthChange}
      availableMonths={availableMonths}
    >
      {renderContent()}
    </HeaderLayout>
  );
}

export default App;
