import React from 'react'
import { connect } from 'react-redux'
import actions from '../../actions/responses'
import _ from 'underscore'
import {hashToCollection} from '../../libs/hashToCollection'
import ResponseList from './responseList.jsx'
import Question from '../../libs/question'
import questionActions from '../../actions/questions'
import sentenceFragmentActions from '../../actions/sentenceFragments'
import diagnosticQuestionActions from '../../actions/diagnosticQuestions'
import ResponseSortFields from './responseSortFields.jsx'
import ResponseToggleFields from './responseToggleFields.jsx'
import FocusPointForm from './focusPointForm.jsx'
import FocusPointSummary from './focusPointSummary.jsx'
import {getPartsOfSpeechTags} from '../../libs/partsOfSpeechTagging.js'
import POSForResponsesList from './POSForResponsesList.jsx'
var C = require("../../constants").default

const labels = C.ERROR_AUTHORS
const qualityLabels = ["Human Optimal", "Human Sub-Optimal", "Algorithm Optimal", "Algorithm Sub-Optimal",  "Unmatched"]
//["Human Optimal", "Human Sub-Optimal", "Algorithm Optimal", "Algorithm Sub-Optimal",  "Unmatched",
                // "Focus Point Hint", "Word Error Hint", "Punctuation Hint", "Capitalization Hint", "Punctuation and Case Hint", "Whitespace Hint",
                // "Missing Word Hint", "Additional Word Hint", "Modified Word Hint", "Missing Details Hint", "Not Concise Hint", "No Hint"]
const colors = ["#81c784", "#ffb74d", "#ba68c8", "#5171A5", "#e57373"]

const responsesPerPage = 20;
const feedbackStrings = C.FEEDBACK_STRINGS

const Responses = React.createClass({
  getInitialState: function () {
    let actions;
    if (this.props.mode === "sentenceFragment") {
      actions = sentenceFragmentActions;
    } else if (this.props.mode === "diagnosticQuestion") {
      actions = diagnosticQuestionActions;
    } else {
      actions = questionActions;
    }
    return {
      actions: actions,
      viewingResponses: true,
      responsePageNumber: 1
    }
  },

  expand: function (responseKey) {
    this.props.dispatch(actions.toggleExpandSingleResponse(responseKey));
  },

  updateRematchedResponse: function (rid, vals) {
    this.props.dispatch(this.state.actions.submitResponseEdit(this.props.questionID, rid, vals))
  },

  getFocusPoint: function () {
    return this.props.question.focusPoints ? hashToCollection(this.props.question.focusPoints)[0] : undefined
  },

  getPercentageWeakResponses: function() {
    var fields = {
      responses: this.responsesWithStatus(),
      focusPoints: this.props.question.focusPoints ? hashToCollection(this.props.question.focusPoints) : []
    }
    var question = new Question(fields);
    return question.getPercentageWeakResponses()
  },

  getMatchingResponse: function (rid) {
    var fields = {
      responses: _.filter(this.responsesWithStatus(), (resp) => {
        return resp.statusCode < 2
      }),
      focusPoints: this.props.question.focusPoints ? hashToCollection(this.props.question.focusPoints) : []
    }
    var question = new Question(fields);
    return question.checkMatch(this.getResponse(rid).text);
  },

  getErrorsForAttempt: function (attempt) {
    return attempt.feedback
  },

  generateFeedbackString: function (attempt) {
    const errors = this.getErrorsForAttempt(attempt);
    // // add keys for react list elements
    // var errorComponents = _.values(_.mapObject(errors, (val, key) => {
    //   if (val) {
    //     return feedbackStrings[key]
    //   }
    // }))
    return errors
  },

  rematchResponse: function (rid) {
    var newResponse = this.getMatchingResponse(rid)
    var response = this.getResponse(rid)
    if (!newResponse.found) {
      console.log("Rematching not found: ", newResponse)
      var newValues = {
        weak: false,
        text: response.text,
        count: response.count
      }
      this.props.dispatch(
        this.state.actions.setUpdatedResponse(this.props.questionID, rid, newValues)
      )
      return
    }
    if (newResponse.response.text === response.text) {
      console.log("Rematching duplicate", newResponse)
      this.props.dispatch(this.state.actions.deleteResponse(this.props.questionID, rid))
    }

    else if (newResponse.response.key === response.parentID) {
      console.log("Rematching same parent: ", newResponse)
      if (newResponse.author) {
        var newErrorResp = {
          weak: false,
          author: newResponse.author,
          feedback: this.generateFeedbackString(newResponse)
        }
        this.updateRematchedResponse(rid, newErrorResp)
      }
    }
    else {
      console.log("Rematching new error", newResponse)
      var newErrorResp = {
        weak: false,
        parentID: newResponse.response.key,
        author: newResponse.author,
        feedback: this.generateFeedbackString(newResponse)
      }
      this.updateRematchedResponse(rid, newErrorResp)
    }
    // this.updateReponseResource(response)
    // this.submitResponse(response)
    // this.setState({editing: false})
  },

  rematchAllResponses: function () {
    console.log("Rematching All Responses")
    const weak = _.filter(this.responsesWithStatus(), (resp) => {
      return resp.statusCode > 1
    })
    weak.forEach((resp) => {
      console.log("Rematching: ", resp.key)
      this.rematchResponse(resp.key)
    })
    console.log("Finished Rematching All Responses")
  },

  responsesWithStatus: function () {
    var responses = hashToCollection(this.props.question.responses)
    return responses.map((response) => {
      var statusCode;
      if (!response.feedback) {
        statusCode = 4;
      } else if (!!response.parentID) {
        var parentResponse = this.getResponse(response.parentID)
        statusCode = 3;
      } else {
        statusCode = (response.optimal ? 0 : 1);
      }
      response.statusCode = statusCode
      return response
    })
  },

  responsesGroupedByStatus: function () {
    return _.groupBy(this.responsesWithStatus(), 'statusCode')
  },

  gatherVisibleResponses: function () {
    var responses = this.responsesWithStatus();
    const filtered = _.filter(responses, (response) => {
      return (
        this.props.filters.visibleStatuses[qualityLabels[response.statusCode]] &&
        (
          this.props.filters.visibleStatuses[response.author] ||
          (response.author===undefined && this.props.filters.visibleStatuses["No Hint"])
        )
      )
    });
    const sorted = _.sortBy(filtered, (resp) =>
        {return resp[this.props.filters.sorting] || 0 }
    )
    if (this.props.filters.ascending) {
      return sorted
    } else {
      return sorted.reverse()
    }
  },

  getResponse: function (responseID) {
    var responses = hashToCollection(this.props.question.responses)
    return _.find(responses, {key: responseID})
  },

  getChildResponses: function (responseID) {
    var responses = hashToCollection(this.props.question.responses)
    return _.where(responses, {parentID: responseID})
  },

  getResponsesForCurrentPage: function(responses) {
    const bounds = this.getBoundsForCurrentPage(responses)
    // go until responses.length because .slice ends at endIndex-1
    return responses.slice(bounds[0], bounds[1])
  },

  getBoundsForCurrentPage: function(responses) {
    const startIndex = (this.state.responsePageNumber-1)*responsesPerPage;
    const endIndex = startIndex+responsesPerPage > responses.length ? responses.length : startIndex+responsesPerPage
    return [startIndex, endIndex]
  },

  renderResponses: function () {
    if(this.state.viewingResponses) {
      const {questionID} = this.props;
      var responses = this.gatherVisibleResponses();
      var responsesListItems = this.getResponsesForCurrentPage(responses);
      return <ResponseList
        responses={responsesListItems}
        getResponse={this.getResponse}
        getChildResponses={this.getChildResponses}
        states={this.props.states}
        questionID={questionID}
        dispatch={this.props.dispatch}
        admin={this.props.admin}
        expanded={this.props.filters.expanded}
        expand={this.expand}
        ascending={this.props.filters.ascending}
        getMatchingResponse={this.getMatchingResponse}
        showPathways={true}
        printPathways={this.mapCountToResponse}
        toPathways={this.mapCountToToResponse}
        conceptsFeedback={this.props.conceptsFeedback}
        mode={this.props.mode}
        concepts={this.props.concepts}
        conceptID={this.props.question.conceptID}/>
    }
  },

  toggleResponseSort: function (field) {
    this.props.dispatch(actions.toggleResponseSort(field));
  },

  renderSortingFields: function () {
    return <ResponseSortFields
      sorting={this.props.filters.sorting}
      ascending={this.props.filters.ascending}
      toggleResponseSort={this.toggleResponseSort}/>
  },

  toggleField: function (status) {
    this.props.dispatch(actions.toggleStatusField(status))
  },

  resetFields: function () {
    this.props.dispatch(actions.resetAllFields())
  },

  renderStatusToggleMenu: function () {
    return (
      <ResponseToggleFields
        labels={labels}
        qualityLabels={qualityLabels}
        toggleField={this.toggleField}
        visibleStatuses={this.props.filters.visibleStatuses}
        resetPageNumber={this.resetPageNumber}
        resetFields={this.resetFields} />
    )
  },

  collapseAllResponses: function () {
    this.props.dispatch(actions.collapseAllResponses());
  },

  expandAllResponses: function () {
    const responses = this.responsesWithStatus();
    var newExpandedState = this.props.filters.expanded;
    for (var i = 0; i < responses.length; i++) {
      newExpandedState[responses[i].key] = true;
    };
    this.props.dispatch(actions.expandAllResponses(newExpandedState));
  },

  allClosed: function () {
    var expanded = this.props.filters.expanded;
    for (var i in expanded) {
        if (expanded[i] === true) return false;
    }
    return true;
  },

  renderExpandCollapseAll: function () {
    var text, handleClick;

    if (this.allClosed()) {
      handleClick = this.expandAllResponses;
      text = "Expand All";
    } else {
      handleClick = this.collapseAllResponses;
      text = "Close All";
    }
    return <a className="button is-fullwidth" onClick={handleClick}> {text} </a>
  },

  renderRematchAllButton: function () {
    if (this.props.admin) {
      return (
        <div className="column">
          <button className="button is-fullwidth is-outlined" onClick={this.rematchAllResponses}> Rematch All </button>
        </div>
      )
    }
  },

  renderPOSStrings: function() {
    if(!this.state.viewingResponses) {
      const posTagsList = this.getResponsesForCurrentPage(hashToCollection(this.getPOSTagsList()))
      return (
        <div>
          <POSForResponsesList posTagsList={posTagsList} />
        </div>
      )
    }
  },

  renderViewPOSButton: function () {
    return (
      <div className="column">
        <button className="button is-fullwidth is-outlined" onClick={() => {this.setState({viewingResponses: false, responsePageNumber: 1})}}> View Parts of Speech </button>
      </div>
    )
  },

  renderViewResponsesButton: function () {
    return (
      <div className="column">
        <button className="button is-fullwidth is-outlined" onClick={() => {this.setState({viewingResponses: true, responsePageNumber: 1})}}> View Unique Responses </button>
      </div>
    )
  },

  renderResetAllFiltersButton: function () {
    return (
      <div className="column">
        <button className="button is-fullwidth is-outlined" onClick={this.resetFields}>Reset All Filters</button>
      </div>
    )
  },

  getToPathwaysForResponse: function (rid) {
    var responseCollection = hashToCollection(this.props.pathways.data);
    var responsePathways = _.where(responseCollection, {fromResponseID: rid});
    return responsePathways;
  },

  getUniqAndCountedToResponsePathways: function (rid) {
    const counted = _.countBy(this.getToPathwaysForResponse(rid), (path)=>{
      return path.toResponseID;
    });
    return counted;
  },

  mapCountToToResponse: function (rid) {
    const mapped = _.mapObject(this.getUniqAndCountedToResponsePathways(rid), (value, key) => {
      var response = this.props.question.responses[key]
      // response.pathCount = value
      return response
    });
    return _.values(mapped)
  },

  // From pathways

  getFromPathwaysForResponse: function (rid) {
    var responseCollection = hashToCollection(this.props.pathways.data);
    var responsePathways = _.where(responseCollection, {toResponseID: rid});
    return responsePathways;
  },

  getUniqAndCountedResponsePathways: function (rid) {
    const counted = _.countBy(this.getFromPathwaysForResponse(rid), (path)=>{
      return path.fromResponseID;
    });
    return counted;
  },

  getPOSTagsList: function() {
    const responses = this.gatherVisibleResponses()

    var responsesWithPOSTags = responses.map((response) => {
      response.posTags = getPartsOfSpeechTags(response.text.replace(/(<([^>]+)>)/ig, "").replace(/&nbsp;/ig, "")) //some text has html tags
      return response
    })

    var posTagsList = {}, posTagsAsString = ""
    responses.forEach((response) => {
      posTagsAsString = response.posTags.join()
      if(posTagsList[posTagsAsString]) {
        posTagsList[posTagsAsString].count += response.count
        posTagsList[posTagsAsString].responses.push(response)
      } else {
        posTagsList[posTagsAsString] = {
          tags: response.posTags,
          count: response.count,
          responses: [
            response
          ]
        }
      }
    })
    return posTagsList
  },

  mapCountToResponse: function (rid) {
    const mapped = _.mapObject(this.getUniqAndCountedResponsePathways(rid), (value, key) => {
      var response = this.props.question.responses[key]
      if (response) {
        response.pathCount = value
      } else {
        response = {
          initial: true,
          pathCount: value,
          key: 'initial'
        }
      }
      return response
    });
    return _.values(mapped)
  },

  incrementPageNumber: function() {
    if(this.state.responsePageNumber < this.getNumberOfPages()) {
      this.setState({
        responsePageNumber: this.state.responsePageNumber+1
      })
    }
  },

  decrementPageNumber: function() {
    if(this.state.responsePageNumber !== 1) {
      this.setState({
        responsePageNumber: this.state.responsePageNumber-1
      })
    }
  },

  getNumberOfPages: function() {
    var array
    if(this.state.viewingResponses) {
      array = this.gatherVisibleResponses()
    } else {
      array = hashToCollection(this.getPOSTagsList())
    }
    return Math.ceil(array.length/responsesPerPage)
  },

  submitFocusPointForm: function(data){
      if (this.getFocusPoint()) {
        this.props.dispatch(this.state.actions.submitEditedFocusPoint(this.props.questionID, data, this.getFocusPoint().key))
      } else {
          this.props.dispatch(this.state.actions.submitNewFocusPoint(this.props.questionID, data));
      }
  },

  renderFocusPoint: function () {
    // fp is a required prop for FocusPointForm, however, if a question doesn't have
    // an fp, it evaluates to undefined, triggering an error on a required proptype.
    let fp = this.getFocusPoint() ? this.getFocusPoint() : false;
    return (
        <FocusPointSummary fp={fp}>
          <FocusPointForm fp={fp} submitFocusPoint={this.submitFocusPointForm}/>
        </FocusPointSummary>
    )
  },

  resetPageNumber: function() {
    this.setState({
      responsePageNumber: 1
    })
  },

  renderDisplayingMessage: function() {
    var array, endWord
    if(this.state.viewingResponses) {
      array = this.gatherVisibleResponses()
      endWord = " responses"
    } else {
      array = hashToCollection(this.getPOSTagsList())
      endWord = " parts of speech strings"
    }
    const bounds = this.getBoundsForCurrentPage(array)
    const message = "Displaying " + (bounds[0]+1) + "-" + (bounds[1]) + " of " + (array.length) + endWord
    return <p className="label">{message}</p>
  },

  renderPageNumbers: function() {
    // var array
    // if(this.state.viewingResponses) {
    //   array = this.gatherVisibleResponses()
    // } else {
    //   array = this.getPOSTagsList()
    // }

    const responses = this.gatherVisibleResponses()
    const responsesPerPage = 20;
    const numPages = Math.ceil(responses.length/responsesPerPage)
    const pageNumbers = _.range(1, numPages+1)

    var pageNumberStyle = {}
    const numbersToRender = pageNumbers.map((pageNumber) => {
      if(this.state.responsePageNumber===pageNumber) {
        pageNumberStyle = {
          "backgroundColor": "lightblue"
        }
      } else {
        pageNumberStyle = {}
      }
      return (
        <li>
          <a className="button" style={pageNumberStyle} onClick={() => {this.setState({responsePageNumber: pageNumber})}}>{pageNumber}</a>
        </li>
      )
    })

    var nextButtonClassName = "button pagination-extreme-button"
    if(this.state.responsePageNumber===this.getNumberOfPages()) {
      nextButtonClassName+=" is-disabled"
    }
    const nextButton = <a className={nextButtonClassName} onClick={this.incrementPageNumber}>Next</a>

    var prevButtonClassName = "button pagination-extreme-button"
    if(this.state.responsePageNumber===1) {
      prevButtonClassName+=" is-disabled"
    }
    const prevButton = <a className={prevButtonClassName} onClick={this.decrementPageNumber}>Prev</a>

    return (
      <div>
        <div className="response-pagination-container">
          <nav className="pagination response-pagination">
            {prevButton}
            {nextButton}
            <ul>
              {numbersToRender}
            </ul>
          </nav>
        </div>
      </div>
    )
  },

  render: function () {
    // console.log("Inside response component, props: ", this.props)
    return (
      <div>
        {this.renderFocusPoint()}
        <div className="columns">
          <div className="column">
            Percentage of weak reponses: {this.getPercentageWeakResponses()}%
          </div>
        </div>
        <div className="tabs is-toggle is-fullwidth">
          {this.renderSortingFields()}
        </div>
        <div className="tabs is-toggle is-fullwidth">
          {this.renderStatusToggleMenu()}
        </div>
        <div className="columns">
          <div className="column">
            {this.renderExpandCollapseAll()}
          </div>
          {this.renderRematchAllButton()}
          {this.renderResetAllFiltersButton()}
          {this.renderViewResponsesButton()}
          {this.renderViewPOSButton()}
        </div>

        {this.renderDisplayingMessage()}
        {this.renderPageNumbers()}
        {this.renderResponses()}
        {this.renderPOSStrings()}
        {this.renderPageNumbers()}
      </div>
    )
  }
})


function select(state) {
  return {
    filters: state.filters,
    pathways: state.pathways,
    conceptsFeedback: state.conceptsFeedback,
    concepts: state.concepts
  }
}

export default connect(select)(Responses);
