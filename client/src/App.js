// core
import React, { useState, useEffect, useRef } from "react";
import { usePosition } from "use-position";
import _ from "lodash";

// material-ui
import AppBar from "@material-ui/core/AppBar";
import Button from "@material-ui/core/Button";
import PersonPinIcon from "@material-ui/icons/PersonPin";
import GitHubIcon from "@material-ui/icons/GitHub";
import CssBaseline from "@material-ui/core/CssBaseline";
import Grid from "@material-ui/core/Grid";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import Link from "@material-ui/core/Link";
import LinearProgress from "@material-ui/core/LinearProgress";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import TextField from "@material-ui/core/TextField";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";

import Map from "./components/Map";

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {"Copyright © "}
      {new Date().getFullYear()}
      {" Common Computer Inc."}
    </Typography>
  );
}

const useStyles = makeStyles((theme) => ({
  icon: {
    marginRight: theme.spacing(2),
  },
  heroContent: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(8, 0, 6),
  },
  heroButtons: {
    marginTop: theme.spacing(4),
  },
  cardGrid: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  cardMedia: {
    paddingTop: "56.25%", // 16:9
  },
  cardContent: {
    flexGrow: 1,
  },
  footer: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(6),
  },
  categoryActive: {
    backgroundColor: theme.palette.primary.main,
  },
  categoryDefault: {
    cursor: "pointer",
  },
}));

const categories = [
  { val: 0, name: "Supermarket" },
  { val: 1, name: "Shopping Mall" },
  { val: 2, name: "Restaurant" },
  { val: 3, name: "Cafe" },
  { val: 4, name: "Hospital" },
  { val: 5, name: "Pharmacy" },
  { val: 6, name: "Bank" },
];

const days = [
  { val: -1, name: "Live Data" },
  { val: 0, name: "Sunday" },
  { val: 1, name: "Monday" },
  { val: 2, name: "Tuesday" },
  { val: 3, name: "Wednesday" },
  { val: 4, name: "Thursday" },
  { val: 5, name: "Friday" },
  { val: 6, name: "Saturday" },
];

const times = [];
for (let i = 0; i < 24; i++) {
  const val = i;
  let name;
  if (i === 0) {
    name = "12 AM";
  } else if (i === 12) {
    name = "12 PM";
  } else {
    name = (i % 12) + (i < 12 ? " AM" : " PM");
  }
  times.push({ val, name });
}

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function LocationSnackbar(props) {
  const classes = useStyles();
  const { setSnackbarOpen, snackbarOpen } = props;

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setSnackbarOpen(false);
  };

  return (
    <div className={classes.root}>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={10000}
        onClose={handleClose}
      >
        <Alert onClose={handleClose} severity="warning">
          Please turn on your location services and refresh this page!
        </Alert>
      </Snackbar>
    </div>
  );
}

const getLocations = async (category, latitude, longitude) => {
  return new Promise((resolve, reject) => {
    fetch(
      `/api/locations?category=${category}&latitude=${latitude}&longitude=${longitude}`
    )
      .then((res) => res.json())
      .then((locations) => resolve(locations));
  });
};

export default function App() {
  const classes = useStyles();

  const [loading, setLoading] = useState(true);
  const allData = useRef([]);
  const [data, setData] = useState({ locations: [] });
  const { latitude, longitude, error } = usePosition(false);
  const mapCoords = useRef({ lat: latitude, lng: longitude });
  const zoom = useRef(0);

  // for snackbar
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);

  const [searchText, setSearchText] = useState("");

  // for category
  const category = useRef(0);
  const [day, setDay] = useState(-1);
  const [time, setTime] = useState(null);
  const [dayAnchorEl, setDayAnchorEl] = useState(null);
  const [timeAnchorEl, setTimeAnchorEl] = useState(null);

  // filter no time data
  const [excludeNoTimeData, setExcludeNoTimeData] = useState(false);

  useEffect(() => {
    if (excludeNoTimeData) {
      setData({ locations: filterDayTime(data.locations) });
    } else {
      setData({ locations: JSON.parse(JSON.stringify(allData.current)) });
    }
  }, [excludeNoTimeData]);

  useEffect(() => {
    setData({ locations: filterDayTime(allData.current) });
  }, [day, time]);

  const handleChangeDay = (event) => {
    setDay(event.target.value);
    if (event.target.value === -1) {
      setTime(null);
    } else {
      setTime(new Date().getHours());
    }
    setDayAnchorEl(null);
  };

  const handleChangeTime = (event) => {
    if (day === -1) {
      alert("Please select the day of the week first and then set the time. " +
        "Currently you're viewing the 'Live Data'. This setting can be changed in the 'Day' menu.")
    } else {
      setTime(event.target.value);
      setTimeAnchorEl(null);
    }
  };

  const handleChangeText = (event) => {
    setSearchText(event.target.value);
  };
  
  const handleCloseDayMenu = (event) => {
    setDayAnchorEl(null);
  };

  const handleCloseTimeMenu = (event) => {
    setTimeAnchorEl(null);
  };

  const handleNoTimeData = () => {
    setExcludeNoTimeData(!excludeNoTimeData);
  };

  const handleSearch = async () => {
    const query = searchText;
    setSearchText("");
    setExcludeNoTimeData(false);
    setDay(-1);
    setTime(null);

    const result = await getLocations(query, mapCoords.current.lat, mapCoords.current.lng);
    if (!result) return;

    // remove duplicates
    const data = {
      locations: _.uniqBy(result.locationInfoList, (val) => val.longitude + ',' + val.latitude),
    };

    // store non-filtered data
    allData.current = JSON.parse(JSON.stringify(data.locations));

    setData(data);
  };

  const handleMapCoordsChange = async () => {
    await fetchAndFilterData();
  }

  const handleCategoryChange = async (val) => {
    category.current = val;
    await fetchAndFilterData();
  }

  const fetchAndFilterData = async () => {
    if (!mapCoords.current.lat || !mapCoords.current.lng) {
      return;
    }
    const promises = [];
    promises.push(
      getLocations(
        categories[category.current].name,
        mapCoords.current.lat,
        mapCoords.current.lng,
      )
    );
    if (category.current === 0) {
      promises.push(
        getLocations(
          "Grocery store",
          mapCoords.current.lat,
          mapCoords.current.lng,
        )
      );
    }
    const result = await Promise.all(promises);
    if (!result || !result.length || !result[0].locationInfoList) {
      return; // setData({ locations: [] }) ?
    }

    const data = { locations: result[0].locationInfoList };

    // concat "Grocery store"
    if (result[1] && result[1].locationInfoList) {
      data.locations = data.locations.concat(result[1].locationInfoList);
    }

    // remove duplicates
    data.locations = _.uniqBy(data.locations, (val) => val.longitude + ',' + val.latitude);
    
    // store non-filtered data
    allData.current = JSON.parse(JSON.stringify(data.locations));

    // exclude "no time data" and filter by current day, time settings
    if (excludeNoTimeData) {
      data.locations = filterDayTime(data.locations);
    }
    
    setData(data);
  }

  const filterDayTime = (data) => {
    if (!excludeNoTimeData) return data;
    if (day === -1) {
      return _.filter(data, (loc) => loc.nowStatus !== "No popular times data");
    } else {
      return _.filter(data, (loc) => {
        // If 'time' is set, check the status at the time of the day exists.
        // If not, check the status at the current time of user exists.
        if (loc.allStatus && loc.allStatus[day] && loc.allStatus[day].length) {
          // It should always be the case that time !== null here
          const stat = loc.allStatus[day].filter(stat => { return stat.time === time })[0];
          return stat && stat.status && stat.status !== '';
        } else {
          return false;
        }
      });
    }
  }

  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position="relative">
        <Toolbar>
          <PersonPinIcon className={classes.icon} />
          <Typography variant="h5" color="inherit" noWrap>
            Crowdy
          </Typography>
        </Toolbar>
      </AppBar>
      <main>
        {/* Hero unit */}
        <div className={classes.heroContent}>
          <Container maxWidth="md">
            <Typography
              component="h1"
              variant="h2"
              align="left"
              color="textPrimary"
              paragraph
            >
              Find supermarkets near you that are not crowded! Based on{" "}
              <Link
                color="primary"
                href="https://support.google.com/business/answer/6263531?hl=en"
              >
                popular times data*
              </Link>{" "}
              from Google Maps
            </Typography>
            <Typography
              variant="subtitle1"
              align="left"
              color="textSecondary"
              paragraph
            >
              * Data might not be 100% accurate as it is obtained via web
              scraping
            </Typography>
            <LocationSnackbar
              snackbarOpen={snackbarOpen}
              setSnackbarOpen={setSnackbarOpen}
            />
          </Container>
        </div>
        <Container className={classes.cardGrid} maxWidth="md">
          {loading && <LinearProgress />}
          {/* End hero unit */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "row" }}>
              <TextField
                style={{ display: "flex", flex: 5 }}
                hinttext="Search..."
                variant="outlined"
                value={searchText}
                onChange={handleChangeText}
                onKeyPress={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                    event.preventDefault();
                  }
                }}
              />
              <Button
                style={{ display: "flex", flex: 1 }}
                onClick={handleSearch}
              >
                Search
              </Button>
            </div>
            <div>
              {categories.map((item, index) => (
                <Button onClick={() => handleCategoryChange(item.val)} key={index}>
                  {item.name}
                </Button>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "row" }}>
                <Button
                  aria-controls="simple-menu"
                  aria-haspopup="true"
                  onClick={(event) => setDayAnchorEl(event.currentTarget)}
                >
                  Day
                </Button>
                <Menu
                  id="select-day"
                  onClose={handleCloseDayMenu}
                  open={Boolean(dayAnchorEl)}
                  anchorEl={dayAnchorEl}
                >
                  {days.map((item, index) => (
                    <MenuItem selected={day === item.val} onClick={handleChangeDay} value={item.val} key={index}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Menu>

                <Button
                  aria-controls="simple-menu"
                  aria-haspopup="true"
                  onClick={(event) => setTimeAnchorEl(event.currentTarget)}
                >
                  Time
                </Button>
                <Menu
                  id="select-time"
                  onClose={handleCloseTimeMenu}
                  open={Boolean(timeAnchorEl)}
                  anchorEl={timeAnchorEl}
                >
                  {times.map((item, index) => (
                    <MenuItem selected={time === item.val} onClick={handleChangeTime} value={item.val} key={index}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Menu>
              </div>
              <Button onClick={handleNoTimeData}>Exclude no time data</Button>
            </div>
          </div>
          <Map
            data={data}
            day={day}
            time={time}
            userGps={{ latitude, longitude }}
            mapCoords={mapCoords}
            loading={loading}
            setLoading={setLoading}
            handleMapCoordsChange={handleMapCoordsChange}
          />
        </Container>
      </main>
      {/* Footer */}
      <footer className={classes.footer}>
        <Grid container direction="row" justify="space-between">
          <Grid container style={{ maxWidth: "300px" }} direction="row">
            <Grid item>
              <Link color="inherit" href="https://ainize.ai">
                POWERED BY AINIZE
              </Link>
            </Grid>
            <Grid item style={{ marginLeft: "16px" }}>
              <Link color="inherit" href="https://github.com/liayoo/crowdy">
                VISIT GITHUB
              </Link>
            </Grid>
          </Grid>
          <Copyright />
        </Grid>
      </footer>
      {/* End footer */}
    </React.Fragment>
  );
}
