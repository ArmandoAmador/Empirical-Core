import 'babel-polyfill';
import React, { Component, PropTypes } from "react";
import NavBar from './navbar/navbar.jsx';
import "../styles/style.scss";

export default React.createClass({
  render(){
    return (
      <div>
        <NavBar/>
        {this.props.children}
      </div>
    )
  }
});