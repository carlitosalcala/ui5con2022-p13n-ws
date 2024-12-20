sap.ui.define(
  [
    "sap/m/Table",
    "sap/m/p13n/Engine",
    "sap/m/p13n/SelectionController",
    "sap/m/p13n/SortController",
    "sap/m/p13n/GroupController",
    "sap/m/p13n/FilterController",
    "sap/ui/model/Filter",
    "sap/m/p13n/MetadataHelper",
    "sap/m/p13n/modification/FlexModificationHandler",
    "sap/ui/model/Sorter",
  ],
  function (
    Table,
    Engine,
    SelectionController,
    SortController,
    GroupController,
    FilterController,
    Filter,
    MetadataHelper,
    FlexModificationHandler,
    Sorter
  ) {
    "use strict";
    var P13nTable = Table.extend("ui5con.p13nApp.control.P13nTable", {
      constructor: function () {
        Table.apply(this, arguments);

        this._pInitialized = new Promise(
          function (resolve, reject) {
            this.attachEventOnce(
              "updateFinished",
              function () {
                this._initP13n();
                resolve();
              },
              this
            );
          }.bind(this)
        );
      },
      renderer: "sap.m.TableRenderer",
    });

    P13nTable.prototype._initP13n = function () {
      var aColumnsMetadata = [];

      this.getColumns().forEach(
        function (oColumn, iIndex) {
          aColumnsMetadata.push({
            key: oColumn.getId(),
            label: oColumn.getHeader().getText(),
            path: this.getItems()[0]
              .getCells()
              [iIndex].getBinding("text")
              .getPath(),
          });
        }.bind(this)
      );

      this.oHelper = new MetadataHelper(aColumnsMetadata);

      Engine.getInstance().register(this, {
        helper: this.oHelper,
        modification: new FlexModificationHandler(),
        controller: {
          Columns: new SelectionController({
            control: this,
            targetAggregation: "columns",
          }),
          Sorter: new SortController({
            control: this,
          }),
          Groups: new GroupController({
            control: this,
          }),
          Filter: new FilterController({
            control: this,
          }),
        },
      });

      Engine.getInstance().attachStateChange(
        function (oEvt) {
          if (oEvt.getParameter("control") === this) {
            this.onStateChange(oEvt.getParameter("state"));
          }
        }.bind(this)
      );
    };

    P13nTable.prototype.openP13n = function (oEvent) {
      Engine.getInstance().show(
        this,
        ["Columns", "Sorter", "Groups", "Filter"],
        {
          title: "Table Settings",
          source: oEvent.getSource(),
        }
      );
    };

    P13nTable.prototype.onStateChange = function (oState) {
      this.getColumns().forEach(function (oColumn) {
        // if the column is not in the state, it is not visible
        oColumn.setVisible(
          !!oState.Columns.find(function (oStateItem) {
            return oColumn.getId() === oStateItem.key;
          })
        );
      });

      oState.Columns.forEach(this._moveColum, this);

      var aSorter = [];

      oState.Sorter.forEach(function (oSorter) {
        aSorter.push(
          new Sorter(this.oHelper.getPath(oSorter.key), oSorter.descending)
        );
      }, this);

      oState.Groups.forEach(function (oGroup) {
        aSorter.push(
          new Sorter(this.oHelper.getPath(oGroup.key), oGroup.descending, true)
        );
      }, this);

      try {
        const aFilter = [];
        Object.keys(oState.Filter).forEach((sFilterKey) => {
          const filterPath = this.oMetadataHelper.getProperty(sFilterKey); //.path;

          oState.Filter[sFilterKey].forEach(function (oConditon) {
            aFilter.push(
              new Filter(
                this.oHelper.getPath(oGroup.key),
                "Contains",
                this.oHelper.getPath(oGroup.key).values[0]
              )
            );
          });
        });
        this.byId("filterInfo").setVisible(aFilter.length > 0);

        return aFilter;
      } catch (error) {
        console.log("createFilters standard not executed");
      }

      this.getBinding("items").sort(aSorter);
    };

    P13nTable.prototype._moveColum = function (oStateColumn, iIndex) {
      var oCol = sap.ui.getCore().byId(oStateColumn.key);
      var iOldIndex = this.getColumns().indexOf(oCol);

      if (iIndex != iOldIndex) {
        this.removeColumn(oCol);
        this.insertColumn(oCol, iIndex);

        var fnMoveCells = function (oItem) {
          if (oItem.isA("sap.m.ColumnListItem")) {
            var oCell = oItem.removeCell(iOldIndex);
            oItem.insertCell(oCell, iIndex);
          }
        };

        fnMoveCells(this.getBindingInfo("items").template);
        this.getItems().forEach(fnMoveCells);
      }
    };

    P13nTable.prototype.applyState = function (oState) {
      return this._pInitialized.then(
        function () {
          return Engine.getInstance().applyState(this, oState);
        }.bind(this)
      );
    };

    P13nTable.prototype.retrieveState = function () {
      return this._pInitialized.then(
        function () {
          return Engine.getInstance().retrieveState(this);
        }.bind(this)
      );
    };

    return P13nTable;
  }
);
