resource "google_monitoring_dashboard" "medirdv" {
  dashboard_json = jsonencode({
    displayName = "MediRDV - Dashboard Infrastructure"

    gridLayout = {
      columns = "2"

      widgets = [
        {
          title = "Cloud Run - Nombre de requêtes"

          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\""

                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner  = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                  }
                }
              }

              plotType = "LINE"
            }]

            yAxis = {
              label = "Requêtes / seconde"
              scale = "LINEAR"
            }
          }
        },

        {
          title = "Cloud Run - Erreurs"

          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\""

                  aggregation = {
                    alignmentPeriod   = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                  }
                }
              }

              plotType = "LINE"
            }]

            yAxis = {
              label = "Erreurs / seconde"
              scale = "LINEAR"
            }
          }
        },

        {
          title = "Cloud Run - Latence"

          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\""

                  aggregation = {
                    alignmentPeriod   = "60s"
                    perSeriesAligner   = "ALIGN_PERCENTILE_95"
                    crossSeriesReducer = "REDUCE_PERCENTILE_95"
                  }
                }
              }

              plotType = "LINE"
            }]

            yAxis = {
              label = "Latence (ms)"
              scale = "LINEAR"
            }
          }
        },


        {
          title = "Cloud SQL - Utilisation CPU"

          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""

                  aggregation = {
                    alignmentPeriod   = "60s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    crossSeriesReducer = "REDUCE_MEAN"
                  }
                }
              }

              plotType = "LINE"
            }]

            yAxis = {
              label = "Utilisation CPU"
              scale = "LINEAR"
            }
          }
        },


        {
          title = "Cloud SQL - Connexions"

          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/network/connections\""

                  aggregation = {
                    alignmentPeriod   = "60s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    crossSeriesReducer = "REDUCE_MEAN"
                  }
                }
              }

              plotType = "LINE"
            }]

            yAxis = {
              label = "Connexions"
              scale = "LINEAR"
            }
          }
        },


        {
          title = "Cloud SQL - Utilisation disque"

          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/disk/bytes_used\""

                  aggregation = {
                    alignmentPeriod   = "60s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    crossSeriesReducer = "REDUCE_MEAN"
                  }
                }
              }

              plotType = "LINE"
            }]

            yAxis = {
              label = "Octets utilisés"
              scale = "LINEAR"
            }
          }
        }
      ]
    }
  })
}
