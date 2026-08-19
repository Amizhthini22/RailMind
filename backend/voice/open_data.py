"""
Real Public Indian Railways Reference Dataset (NDLS–HWH Corridor)
Source: Indian Railways National Train Enquiry System (NTES) & Open Data IR Datasets.
"""
from typing import Dict, List, Any

# Real Station Master Records
REAL_STATIONS = [
    {
        "code": "NDLS",
        "name": "New Delhi",
        "division": "Delhi (DLI)",
        "zone": "Northern Railway (NR)",
        "state": "Delhi",
        "category": "NSG-1",
        "tracks": 16,
        "latitude": 28.6415,
        "longitude": 77.2197,
        "distance_from_ndls_km": 0
    },
    {
        "code": "CNB",
        "name": "Kanpur Central",
        "division": "Prayagraj (PRYJ)",
        "zone": "North Central Railway (NCR)",
        "state": "Uttar Pradesh",
        "category": "NSG-1",
        "tracks": 10,
        "latitude": 26.4539,
        "longitude": 80.3512,
        "distance_from_ndls_km": 440
    },
    {
        "code": "PRYJ",
        "name": "Prayagraj Junction",
        "division": "Prayagraj (PRYJ)",
        "zone": "North Central Railway (NCR)",
        "state": "Uttar Pradesh",
        "category": "NSG-2",
        "tracks": 10,
        "latitude": 25.4439,
        "longitude": 81.8258,
        "distance_from_ndls_km": 634
    },
    {
        "code": "DDU",
        "name": "Pt. Deen Dayal Upadhyaya Junction",
        "division": "Pt. DD Upadhyaya (DDU)",
        "zone": "East Central Railway (ECR)",
        "state": "Uttar Pradesh",
        "category": "NSG-2",
        "tracks": 8,
        "latitude": 25.2818,
        "longitude": 83.1187,
        "distance_from_ndls_km": 786
    },
    {
        "code": "BSB",
        "name": "Varanasi Junction",
        "division": "Lucknow (LKO-NR)",
        "zone": "Northern Railway (NR)",
        "state": "Uttar Pradesh",
        "category": "NSG-2",
        "tracks": 9,
        "latitude": 25.3283,
        "longitude": 82.9863,
        "distance_from_ndls_km": 758
    },
    {
        "code": "GAYA",
        "name": "Gaya Junction",
        "division": "Pt. DD Upadhyaya (DDU)",
        "zone": "East Central Railway (ECR)",
        "state": "Bihar",
        "category": "NSG-2",
        "tracks": 7,
        "latitude": 24.8080,
        "longitude": 85.0028,
        "distance_from_ndls_km": 992
    },
    {
        "code": "PNBE",
        "name": "Patna Junction",
        "division": "Danapur (DNR)",
        "zone": "East Central Railway (ECR)",
        "state": "Bihar",
        "category": "NSG-1",
        "tracks": 10,
        "latitude": 25.6022,
        "longitude": 85.1376,
        "distance_from_ndls_km": 998
    },
    {
        "code": "ASN",
        "name": "Asansol Junction",
        "division": "Asansol (ASN)",
        "zone": "Eastern Railway (ER)",
        "state": "West Bengal",
        "category": "NSG-2",
        "tracks": 7,
        "latitude": 23.6871,
        "longitude": 86.9746,
        "distance_from_ndls_km": 1251
    },
    {
        "code": "HWH",
        "name": "Howrah Junction",
        "division": "Howrah (HWH)",
        "zone": "Eastern Railway (ER)",
        "state": "West Bengal",
        "category": "NSG-1",
        "tracks": 23,
        "latitude": 22.5839,
        "longitude": 88.3426,
        "distance_from_ndls_km": 1451
    }
]

# Real Train Timetables & Configurations
REAL_TRAINS = [
    {
        "train_number": "22436",
        "name": "Vande Bharat Express",
        "type": "Superfast Express / Semi-High Speed EMU",
        "origin": "NDLS",
        "destination": "BSB",
        "route_codes": ["NDLS", "CNB", "PRYJ", "BSB"],
        "schedule": {
            "NDLS": "06:00",
            "CNB": "10:08",
            "PRYJ": "12:08",
            "BSB": "14:00"
        },
        "coaches": 16,
        "rake_type": "Train 18 / Vande Bharat 2.0",
        "max_speed_kmh": 130,
        "weighted_avg_fare_inr": 1750,
        "is_real_schedule": True
    },
    {
        "train_number": "12302",
        "name": "Howrah Rajdhani Express (via Gaya)",
        "type": "Rajdhani Express",
        "origin": "NDLS",
        "destination": "HWH",
        "route_codes": ["NDLS", "CNB", "PRYJ", "DDU", "GAYA", "ASN", "HWH"],
        "schedule": {
            "NDLS": "16:50",
            "CNB": "21:32",
            "PRYJ": "23:43",
            "DDU": "01:25",
            "GAYA": "03:50",
            "ASN": "07:28",
            "HWH": "09:55"
        },
        "coaches": 22,
        "rake_type": "LHB",
        "max_speed_kmh": 130,
        "weighted_avg_fare_inr": 1950,
        "is_real_schedule": True
    },
    {
        "train_number": "12004",
        "name": "Lucknow Swarna Shatabdi Express",
        "type": "Shatabdi Express",
        "origin": "NDLS",
        "destination": "LKO",
        "route_codes": ["NDLS", "GZB", "ALJN", "TDL", "CNB", "LKO"],
        "schedule": {
            "NDLS": "06:10",
            "CNB": "11:20",
            "LKO": "12:40"
        },
        "coaches": 18,
        "rake_type": "LHB",
        "max_speed_kmh": 130,
        "weighted_avg_fare_inr": 1350,
        "is_real_schedule": True
    },
    {
        "train_number": "12304",
        "name": "Poorva Express (via Patna)",
        "type": "Superfast Express",
        "origin": "NDLS",
        "destination": "HWH",
        "route_codes": ["NDLS", "CNB", "PRYJ", "DDU", "PNBE", "ASN", "HWH"],
        "schedule": {
            "NDLS": "17:40",
            "CNB": "22:55",
            "PRYJ": "01:15",
            "DDU": "03:20",
            "PNBE": "06:50",
            "ASN": "13:18",
            "HWH": "17:00"
        },
        "coaches": 22,
        "rake_type": "LHB",
        "max_speed_kmh": 110,
        "weighted_avg_fare_inr": 1150,
        "is_real_schedule": True
    }
]

def get_open_data_summary() -> Dict[str, Any]:
    """Summary of verified Indian Railways open data integration."""
    return {
        "corridor": "New Delhi – Howrah Backbone (Grand Chord / Main Line)",
        "stations_count": len(REAL_STATIONS),
        "trains_count": len(REAL_TRAINS),
        "source": "Ministry of Railways / IRCTC / NTES Public Timetables",
        "real_fields": [
            "station_codes (NDLS, CNB, PRYJ, DDU, BSB, GAYA, PNBE, ASN, HWH)",
            "station_names",
            "station_divisions_and_zones",
            "geographic_coordinates_and_inter_station_distances",
            "official_train_numbers (22436, 12302, 12004, 12304)",
            "official_train_names",
            "actual_timetables_and_scheduled_arrival_departure_times",
            "IRCTC_TDR_Rule_4_refund_schedule_brackets",
            "passenger_fare_weights_by_coach_class"
        ],
        "synthetic_simulation_fields": [
            "injected_delay_incidents (simulated failure triggers)",
            "live_block_section_track_occupancy_telemetry",
            "passenger_phone_numbers_and_simulated_PNRs",
            "standby_relief_train_dispatch_simulation (02401, 02244, 02302)"
        ]
    }
