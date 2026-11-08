export const kpiDefinitions = [
  {
    kpi_name: "Total Registered Boxes",
    purpose: "Count of all registered box records",
    suggested_formula: "Count(box_id)",
    data_source: "Box Management"
  },
  {
    kpi_name: "Active Box Percentage",
    purpose: "Share of registered boxes marked active",
    suggested_formula: "Active boxes / Total registered boxes * 100",
    data_source: "Box Management"
  },
  {
    kpi_name: "Total Collection",
    purpose: "Sum of collection amounts for selected period",
    suggested_formula: "SUM(collection_amount_pkr)",
    data_source: "Collections"
  },
  {
    kpi_name: "Average Collection per Active Box",
    purpose: "Average verified collection per active box in period",
    suggested_formula: "Verified collection total / active boxes",
    data_source: "Collections + Boxes"
  },
  {
    kpi_name: "City-Wise Collection",
    purpose: "Verified collection total grouped by city",
    suggested_formula: "SUM(amount) GROUP BY city_id",
    data_source: "Analytics"
  },
  {
    kpi_name: "Collection Growth Rate",
    purpose: "Percentage change versus previous comparable period",
    suggested_formula: "(Current - Previous) / Previous * 100",
    data_source: "Analytics"
  },
  {
    kpi_name: "Rider Task Completion",
    purpose: "Share of assigned tasks completed",
    suggested_formula: "Completed tasks / Total tasks * 100",
    data_source: "Rider Tasks"
  },
  {
    kpi_name: "Partner-Wise Collection",
    purpose: "Verified collection total grouped by partner",
    suggested_formula: "SUM(amount) GROUP BY partner_id",
    data_source: "Partners + Collections"
  },
  {
    kpi_name: "Cost per Box",
    purpose: "Operational cost divided by managed boxes",
    suggested_formula: "Approved operational cost / relevant box count",
    data_source: "Costs + Boxes"
  },
  {
    kpi_name: "Benefit-to-Cost Ratio",
    purpose: "Defined benefit divided by defined cost",
    suggested_formula: "Benefit / Cost (definitions require management approval)",
    data_source: "Finance + Analytics"
  },
  {
    kpi_name: "Reporting Completion",
    purpose: "Required reports generated on schedule",
    suggested_formula: "Reports completed / Reports due * 100",
    data_source: "Reporting"
  }
];
