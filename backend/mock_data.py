from models import Station, Train

STATIONS = [
    Station(id="s1", name="New Delhi", code="NDLS"),
    Station(id="s2", name="Kanpur Central", code="CNB"),
    Station(id="s3", name="Prayagraj Junction", code="PRYJ"),
    Station(id="s4", name="Varanasi Junction", code="BSB"),
    Station(id="s5", name="Patna Junction", code="PNBE"),
    Station(id="s6", name="Howrah Junction", code="HWH"),
]

STATION_MAP = {s.code: s for s in STATIONS}

TRAINS = [
    Train(
        id="t1",
        name="Vande Bharat Express",
        number="22436",
        route=["NDLS", "CNB", "PRYJ", "BSB"],
        schedule={
            "NDLS": "06:00",
            "CNB": "10:08",
            "PRYJ": "12:08",
            "BSB": "14:00"
        },
        current_station="NDLS"
    ),
    Train(
        id="t2",
        name="Rajdhani Express",
        number="12302",
        route=["NDLS", "CNB", "PRYJ", "PNBE", "HWH"],
        schedule={
            "NDLS": "16:50",
            "CNB": "21:32",
            "PRYJ": "23:43",
            "PNBE": "04:00",
            "HWH": "09:55"
        },
        current_station="NDLS"
    ),
    Train(
        id="t3",
        name="Shatabdi Express",
        number="12004",
        route=["NDLS", "CNB"],
        schedule={
            "NDLS": "06:10",
            "CNB": "11:25"
        },
        current_station="NDLS"
    )
]

TRAIN_MAP = {t.id: t for t in TRAINS}

STANDBY_TRAINS = [
    Train(
        id="t_standby_cnb",
        name="Relief Special Rake (CNB)",
        number="02401",
        route=["CNB", "PRYJ", "BSB", "PNBE", "HWH"],
        schedule={
            "CNB": "21:35",
            "PRYJ": "23:45",
            "BSB": "01:15",
            "PNBE": "04:05",
            "HWH": "10:00"
        },
        current_station="CNB"
    ),
    Train(
        id="t_standby_ndls",
        name="Clone Vande Bharat Special",
        number="02244",
        route=["NDLS", "CNB", "PRYJ", "BSB"],
        schedule={
            "NDLS": "06:15",
            "CNB": "10:15",
            "PRYJ": "12:15",
            "BSB": "14:10"
        },
        current_station="NDLS"
    ),
    Train(
        id="t_standby_pryj",
        name="Prayagraj Standby Express",
        number="02302",
        route=["PRYJ", "BSB", "PNBE", "HWH"],
        schedule={
            "PRYJ": "23:50",
            "BSB": "01:20",
            "PNBE": "04:10",
            "HWH": "10:05"
        },
        current_station="PRYJ"
    )
]

STANDBY_MAP = {t.id: t for t in STANDBY_TRAINS}
